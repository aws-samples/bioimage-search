import sys
import boto3
import numpy as np
import io
from pathlib import Path
import argparse
from PIL import Image
import math
import shortuuid as su
import json

"""
This script takes as input a multi-channel image and computes ROIs within that image
using an approach designed for isolation biological cells. To find cell centers, it uses a single channel
assumed to have good single/noise for cell nuclei. Having identified the center
of each cell, it crops across all channels at that location and creates a mulit-channel
numpy array of the cropped data.

Basic steps for this process include:
1. Use of a flat-field background image to normalize the source image
2. Use of a logorithmic normalization function to better distribute variance across the intensity range
3. Use of traditional methods for identifying cell centers (e.g., Otsu's method and dialtion/erosion)

The input is a JSON manifest with a list of such images to process.

The output is a numpy array with all ROIs for a given image, each of which in turn is a multi-channel data structure.

The above output is generated for each image in the input manifest.

Input example:

{
    images: [
        {
            outputBucket: xxx,
            outputKey: xxx,
            flatFieldBucket: xxx,
            flatFieldKey: xxx,
            channelBucket: xxx,
            nuclearChannelKey: xxx,
            additionalChannels: [
                channelKey1: xxx,
                channelKey2: xxx,
                ...
            ]
        },
        {
        ...
        }
    ]
}

"""

parser = argparse.ArgumentParser()

parser.add_argument('--imageManifestBucket', type=str, help='bucket for image manifest')
parser.add_argument('--imageManifestKey', type=str, help='key for image manifest')

args = parser.parse_args()

s3c = boto3.client('s3')

tmpDir="/tmp"

ec2homePath=Path("/home/ec2-user")
if ec2homePath.exists():
    tmpDir="/home/ec2-user/tmp"

tmpPath=Path(tmpDir)
if not tmpPath.exists():
    tmpPath.mkdir()

def getManifestFromS3():
    fileObject = s3c.get_object(Bucket=args.imageManifestBucket, Key=args.imageManifestKey)
    text = fileObject['Body'].read().decode('utf-8')
    return json.loads(text)
    
testJsonObject = getManifestFromS3()

print("TestObject=", testJsonObject)
    
"""    

bucketName='phis-data-bbbc021-1'
imageMetadataKey='BBBC021_v1_image.csv'
segmentKeyPrefix='segmentation'
normedKeyPrefix='normed-imagery'
cellImagePrefix='cell-images'
tmpDir="/tmp"

minPixelCount=200
size_i0=128
size_i1=128
size_d0=1024
size_d1=1280

ec2homePath=Path("/home/ec2-user")
if ec2homePath.exists():
    tmpDir="/home/ec2-user/tmp"

tmpPath=Path(tmpDir)
if not tmpPath.exists():
    tmpPath.mkdir()
    
if len(sys.argv) < 2:
    usage()

platePrefix=sys.argv[1]

s3c = boto3.client('s3', region_name='us-east-1')

def getCsvDfFromS3(bucket, key):
    csvObject = s3c.get_object(Bucket=bucket, Key=key)
    file_stream = csvObject['Body']
    df = pd.read_csv(file_stream)
    return df

image_df = getCsvDfFromS3(bucketName, imageMetadataKey)

dapiKeys=[]
tubulinKeyDict={}
actinKeyDict={}

weekPrefix = platePrefix.split('_')[0]
imagePathnameDapi = weekPrefix + '/' + platePrefix

plate_df = image_df.loc[image_df['Image_PathName_DAPI']==imagePathnameDapi]

for p in range(len(plate_df.index)):
    r = plate_df.iloc[p]
    dapiFile=r['Image_FileName_DAPI']
    dapiKey=platePrefix + '/' + dapiFile
    dapiKeys.append(dapiKey)
    tubulinKeyDict[dapiKey]=platePrefix + '/' + r['Image_FileName_Tubulin']
    actinKeyDict[dapiKey]=platePrefix + '/' + r['Image_FileName_Actin']

def getNormedPath(origPath):
    ip2 = origPath[:-4]
    ip2c = ip2.split('/')
    normName=ip2c[1] + '-norm.tif'
    normKey=normedKeyPrefix + '/' + ip2c[0] + '/' + normName
    return normName, normKey

def getSegmentedCsvPath(origPath):
    ip2 = origPath[:-4]
    ip2c = ip2.split('/')
    csvName=ip2c[1] + '-cell-locations.csv'
    csvKey=segmentKeyPrefix + '/' + ip2c[0] + '/' + csvName
    return csvName, csvKey

def loadImageAsNdArray(imageKey):
    imageObject=s3c.get_object(Bucket=bucketName, Key=imageKey)
    file_stream=imageObject['Body']
    img=Image.open(file_stream)
    return np.array(img)

# This is not needed since we are just writing np arrays
def writeImageToS3(img_array, keyPath):
    keySuffix=keyPath.split('/')[-1]
    img=Image.fromarray(img_array)
    fn = tmpDir + '/' + keySuffix
    img.save(fn)
    with open(fn, 'rb') as fdata:
        s3c.upload_fileobj(fdata, bucketName, keyPath)
    fnPath=Path(fn)
    fnPath.unlink()

def writeNumpyToS3(data_array, keyPath):
    keySuffix=keyPath.split('/')[-1]
    fn = tmpDir + '/' + keySuffix
    np.save(fn, data_array)
    with open(fn, 'rb') as fdata:
        s3c.upload_fileobj(fdata, bucketName, keyPath)
    fnPath=Path(fn)
    fnPath.unlink()

for dapiKey in dapiKeys:
    print("*** dapiKey=", dapiKey)
    tubulinKey = tubulinKeyDict[dapiKey]
    actinKey = actinKeyDict[dapiKey]
    _, dapiNormedKey = getNormedPath(dapiKey)
    _, tubulinNormedKey = getNormedPath(tubulinKey)
    _, actinNormedKey = getNormedPath(actinKey)
    dapiImage = loadImageAsNdArray(dapiNormedKey)
    tubulinImage = loadImageAsNdArray(tubulinNormedKey)
    actinImage = loadImageAsNdArray(actinNormedKey)
    csvName, csvKey = getSegmentedCsvPath(dapiKey)
    cell_df = getCsvDfFromS3(bucketName, csvKey)
    cellDataPath = cellImagePrefix+'/'+dapiKey[:-4]+'-cell.npy'
    cellData = np.zeros( (len(cell_df.index), 3, size_i0, size_i1), dtype=float)
    non_zero_count=0
    for ci in range(len(cell_df.index)):
        cr=cell_df.loc[ci]
        label=cr[0]
        pixelCount=cr[1]
        p0=cr[2]
        p1=cr[3]
        print("label=", label, " pixels=", pixelCount, " p0=", p0, " p1=", p1)
        if ( (p0 < size_i0/2) or (p0 > (size_d0-(size_i0/2)))):
            print ("skipping due to d0 edge")
            continue
        if ( (p1 < size_i1/2) or (p1 > (size_d1-(size_i0/2)))):
            print("skipping due to d1 edge")
            continue
        if ( pixelCount < minPixelCount):
            print("skipping due to min pixel count")
            continue
        print(dapiKey)
        print(tubulinKey)
        print(actinKey)
        d0_start=int(p0-size_i0/2)
        d0_end=d0_start + size_i0
        d1_start=int(p1-size_i1/2)
        d1_end=d1_start + size_i1
        dapi_cell = dapiImage[d0_start:d0_end, d1_start:d1_end]
        tubulin_cell = tubulinImage[d0_start:d0_end, d1_start:d1_end]
        actin_cell = actinImage[d0_start:d0_end, d1_start:d1_end]
        cellData[non_zero_count][0]=dapi_cell
        cellData[non_zero_count][1]=tubulin_cell
        cellData[non_zero_count][2]=actin_cell
        non_zero_count += 1
    writeNumpyToS3(cellData[:non_zero_count], cellDataPath)
    
    """
    
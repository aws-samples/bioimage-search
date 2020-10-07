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
from skimage import io
from skimage.filters import gaussian
from skimage.exposure import histogram
from skimage.filters import threshold_otsu
from skimage.morphology import binary_opening
from skimage.morphology import label
from skimage.exposure import histogram

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
                xxx,
                xxx,
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
tmpDir="/tmp"

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

dapiFiles=[]
tubulinFileDict={}
actinFileDict={}

weekPrefix = platePrefix.split('_')[0]
imagePathnameDapi = weekPrefix + '/' + platePrefix

plate_df = image_df.loc[image_df['Image_PathName_DAPI']==imagePathnameDapi]

for p in range(len(plate_df.index)):
    r = plate_df.iloc[p]
    dapiFile=r['Image_FileName_DAPI']
    dapiFiles.append(platePrefix + '/' + dapiFile)
    tubulinFileDict[dapiFile]=platePrefix + '/' + r['Image_FileName_Tubulin']
    actinFileDict[dapiFile]=platePrefix + '/' + r['Image_FileName_Actin']

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

def find2DCentersFromLabels(labels):
    centers=[]
    maxLabel=labels.max()
    d0=labels.shape[0]
    d1=labels.shape[1]
    labelCounts=np.zeros(shape=(maxLabel+1), dtype=np.int)
    labelPositionsD0=np.zeros(shape=(maxLabel+1), dtype=np.int)
    labelPositionsD1=np.zeros(shape=(maxLabel+1), dtype=np.int)
    for i0 in range(d0):
        for i1 in range(d1):
            l=labels[i0][i1]
            labelCounts[l] += 1
            labelPositionsD0[l] += i0
            labelPositionsD1[l] += i1
    for lp in range(maxLabel+1):
        avgD0=labelPositionsD0[lp]/labelCounts[lp]
        avgD1=labelPositionsD1[lp]/labelCounts[lp]
        lpr = (lp, labelCounts[lp], avgD0, avgD1)
        centers.append(lpr)
    return centers

def computeCellCenters(imageFilekey):
    imgObject = s3c.get_object(Bucket=bucketName, Key=imageFilekey)
    file_stream = imgObject['Body']
    img = Image.open(file_stream)
    pixels = np.array(img)
    otsuThreshold = threshold_otsu(pixels)
    binaryPixels = pixels >= otsuThreshold
    ed1=binary_opening(binaryPixels)
    ed2=binary_opening(ed1)
    ed2int = ed2.astype(np.int)
    ed2intLabels = label(ed2int)
    centers=find2DCentersFromLabels(ed2intLabels)
    return centers

for dfk in dapiFiles:
    c1 = computeCellCenters(dfk)
    csvName, csvKey=getSegmentedCsvPath(dfk)
    print("Writing " + csvKey)
    cellList=''
    for c in c1:
        cellList += (str(c[0]) + ',' + str(c[1]) + ',' + str(c[2]) + ',' + str(c[3]) + '\n')
    s3c.put_object(Body=cellList, Bucket=bucketName, Key=csvKey)

    """
    
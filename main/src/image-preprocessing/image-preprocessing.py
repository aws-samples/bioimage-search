import sys
import traceback
import boto3
import numpy as np
import io
from pathlib import Path
import argparse
from PIL import Image
import math
import shortuuid as su
import json
import scipy.ndimage as nd
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

Edge-case handling for cell centers is handled as follows:

The size for the ROI is specified, which is uniformly applied to each dimension. Edge handling can be considered in three different cases.
'r' is the roisize, and r/2 is half of roisize.

Case 1: the dimension is much larger than ROI size:

    If the entire ROI does not fit (i.e., if the center is closer than r/2 to the edge, then the ROI is discarded).
    
Case 2: the dimension is smaller than the ROI size:

    Then the generated ROI object is simply limited in this dimension to the maximum size, and includes the full range, regardless of where the 
    center is in that dimension.
    
Case 3: the dimension is slightly larger than the ROI size:

    Then the generated ROI object is full-size, but the effective center is shifted to accomplish this. The "maximum shift" will be computed
    as follows: min( (r - DimSize/4), 0)

The input is a JSON manifest with a list of such images to process.

The output has two components:

    1) a numpy array with all ROIs for a given image, each of which in turn is a multi-channel data structure

    2) a json file listing the ROI coordinates for each ROI image wrt its source image

The above output is generated for each image in the input manifest.

Input example:

{
    images: [
        {
            outputBucket: xxx,
            outputKeyPrefix: xxx,
            inputFlatfieldBucket: xxx,
            inputChannelBucket: xxx,
            segmentationChannelName: xxx,
            inputChannels: [
                {
                    name: xxx,
                    imageKey: xxx,
                    flatfieldKey: xxx
                }
            ]
        }
    ]
}

Output ROI coordinate example:

{
    sourceImageBucket: xxx,
    sourceChannelKeys: {
      <name>:xxx,
      <name>:xxx,
      <name>:xxx
    },
    roisize: { // channel, z, y, x
        z: xxx,
        y: xxx,
        x: xxx
    },
    roi: [ 
        {
            z: xxx,
            y: xxx,
            x: xxx
        }
    ]
}

"""

parser = argparse.ArgumentParser()

parser.add_argument('--imageManifestBucket', type=str, help='bucket for image manifest')
parser.add_argument('--imageManifestKey', type=str, help='key for image manifest')
parser.add_argument('--roisize', type=int, help='ROI crop size in pixels')
parser.add_argument('--minvoxels', type=int, help='Exclude objects smaller than this voxel count')

args = parser.parse_args()
s3c = boto3.client('s3')

def setupTmpDir():
    tmpDir="/tmp"
    ec2homePath=Path("/home/ec2-user")
    if ec2homePath.exists():
        tmpDir="/home/ec2-user/tmp"
    tmpPath=Path(tmpDir)
    if not tmpPath.exists():
        tmpPath.mkdir()
    return tmpDir
    
tmpDir = setupTmpDir()

def getManifestFromS3():
    fileObject = s3c.get_object(Bucket=args.imageManifestBucket, Key=args.imageManifestKey)
    text = fileObject['Body'].read().decode('utf-8')
    return json.loads(text)
    
def checkPixShape(pix_shape):
    for d in pix_shape:
        if d != pix_shape[0]:
            return False
    return True
    
def normImageData(image_data):
    max = image_data.max()
    if max > 65535.0:
        return image_data/max
    elif max > 255.0:
        return image_data/65535.0
    elif max > 1.0:
        return image_data/255.0
    else:
        return image_data/max
        
def findHistCutoff(h, p):
    totalPixels=0.0
    ca=h[0]
    cv=h[1]
    for c in ca:
        totalPixels += c
    th=totalPixels*p
    i=0
    cutOffPixels=0.0
    for c in ca:
        if cutOffPixels >= th:
            return cv[i]
        cutOffPixels += c
        i+=1
    return cv[i-1]        
    
def applyImageCutoff(nda, cv):
    for idx, v in np.ndenumerate(nda):
        if (v>cv):
            nda[idx]=cv
            
def findCutoffAvg(nda, cv):
    total = 0.0
    for v in np.nditer(nda):
        if (v>cv):
            total += cv
        else:
            total += v
    avg = total / nda.size
    return avg
    
def normalizeChannel(bval, nda):
    for idx, v in np.ndenumerate(nda):
        n = nda[idx] / bval
        if n < 1.0:
            n=1.0
        l = math.log(n)
        if (l>5.0):
            l=5.0
        nda[idx]=l
    min=nda.min()
    max=nda.max()
    zeroFlag=False
    if min==max:
        nda=0.0
    else:
        s = (max-min)
        for idx, v in np.ndenumerate(nda):
            n = (v-min)/s
            nda[idx]=n

def computeNormedImage(imageBucket, imageKey, flatfieldBucket, flatfieldKey):
    fileObject = s3c.get_object(Bucket=imageBucket, Key=imageKey)
    file_stream = fileObject['Body']
    im = Image.open(file_stream)
    input_data = np.array(im)
    if len(input_data.shape)==2:
        input_data = np.expand_dims(input_data, axis=0)
    return normImageData(input_data)
    
def findCentersFromLabels(labels):
    centers=[]
    maxLabel=labels.max()
    labelCounts=np.zeros(shape=(maxLabel+1), dtype=np.int)
    labelPositions=[]
    for d in range(len(labels.shape)):
        labelPositions.append(np.zeros(shape=(maxLabel+1), dtype=np.int))
    for idx, v in np.ndenumerate(labels):
        labelCounts[v] += 1
        ix=0
        for iv in idx:
            labelPositions[ix][v] += iv
            ix += 1
    for lp in range(maxLabel+1):
        if (labelCounts[lp]>=args.minvoxels):
            ca = []
            ca.append(lp)
            ca.append(labelCounts[lp])
            for d in range(len(labels.shape)):
                na = labelPositions[d]
                ca.append(na[lp]/labelCounts[lp])
            centers.append(ca)
    return centers    

def writeNumpyToS3(data_array, bucketName, keyPath):
    keySuffix=keyPath.split('/')[-1]
    fn = tmpDir + '/' + keySuffix
    np.save(fn, data_array)
    with open(fn, 'rb') as fdata:
        s3c.upload_fileobj(fdata, bucketName, keyPath)
    fnPath=Path(fn)
    fnPath.unlink()
    
def computeCellCenters(pixels):
    otsuThreshold = threshold_otsu(pixels)
    binaryPixels = pixels >= otsuThreshold
    ed1=binary_opening(binaryPixels)
    ed2=binary_opening(ed1)
    ed2int = ed2.astype(np.int)
    ed2Labels, labelCount = nd.label(ed2int)
    centers=findCentersFromLabels(ed2Labels)
    return centers
        
manifest = getManifestFromS3()

images = manifest['images']

roisize = args.roisize

for image in images:
    normedImages = {}
    inputChannelBucket = image['inputChannelBucket']
    inputFlatfieldBucket = image['inputFlatfieldBucket']
    inputChannels = image['inputChannels']
    segmentationChannelName = image['segmentationChannelName']
    pix_shape = []
    input_arr = []
    segment_index = 0
    i=0
    for inputChannel in inputChannels:
        normedImage = computeNormedImage(
            inputChannelBucket,
            inputChannel['imageKey'],
            inputFlatfieldBucket,
            inputChannel['flatfieldKey'])
        pix_shape.append(normedImage.shape)
        input_arr.append(normedImage)
        if inputChannel['name']==segmentationChannelName:
            segment_index=i
        i+=1
    if not checkPixShape(pix_shape):
        sys.exit("Error: image shapes of channels do not match")
    input_data = np.array(input_arr)
    for c in range(input_data.shape[0]):
        channelData = input_data[c]
        h1 = histogram(channelData, 100)
        bcut = findHistCutoff(h1, 0.20)
        bavg = findCutoffAvg(channelData, bcut)
        normalizeChannel(bavg, channelData)
    centers = computeCellCenters(input_data[segment_index])
    roiDimArr = []
    roiDimArr.append(len(centers))
    roiDimArr.append(len(inputChannels))
    for d in range(len(input_data.shape)-1):
        dl = roisize
        if (input_data.shape[d+1] < roisize):
            dl = input_data.shape[d+1]
        roiDimArr.append(dl)
    roiDimTuple = tuple(roiDimArr)
    roiData = np.zeros(roiDimTuple, dtype=float)
    roiCoordinates = []
    r2 = roisize/2
    count=0
    maxEdgeShift = []
    for d in range (len(input_data.shape)-1):
        dl = input_data.shape[d+1]
        maxEdgeShift.append(max( (roisize - dl/4), 0))
    for center in centers:
        label=center[0]
        labelCount=center[1]
        position=center[2:]
        edgeFlag=False
        for d in range(len(position)):
            m = maxEdgeShift[d]
            p=position[d]
            pMax=input_data.shape[d+1]-1
            if ((p+m) < r2) or ((p-m) > (pMax-r2)):
                edgeFlag=True
                break
        if edgeFlag:
            continue
        sarr = []
        rc = []
        for d in range(len(position)):
            pMax=input_data.shape[d+1]
            p=position[d]
            p0=p-r2
            if (p0<0):
                p -= p0
                p0=0
            p1=p+r2
            if (p1>pMax):
                p0 -= (p1-pMax)
                p1=pMax
                if (p0<0):
                    p0=0
            # Size check
            p0 = int(p0)
            p1 = int(p1)
            l = p1-p0
            if ( (l!=roisize) and (l!=pMax) ):
                errorMsg = "ROI dimension invalid: p0={} p1={}".format(p0, p1)
                sys.exit(errorMsg)
            sarr.append(np.s_[p0:p1])
            rc.append( (p0, p1))
        atu = tuple(sarr)
        for c in range(input_data.shape[0]):
            roiData[count][c]=input_data[c][atu]
        roiCoordinates.append(rc)
        count+=1
    roiKey = image['outputKeyPrefix'] + '.npy'
    writeNumpyToS3(roiData, image['outputBucket'], roiKey)
    roiCoordInfo = {}
    roiCoordInfo['sourceImageBucket'] = inputChannelBucket
    sourceChannelKeys = {}
    for chan in inputChannels:
        sourceChannelKeys[chan['name']] = chan['imageKey']
    roiCoordInfo['sourceChannelKeys'] = sourceChannelKeys
    roiSize = {}
    zSize=roisize
    if (input_data.shape[1]<roisize):
        zSize=input_data.shape[1]
    ySize=roisize
    if (input_data.shape[2]<roisize):
        ySize=input_data.shape[2]
    xSize=roisize
    if (input_data.shape[3]<roisize):
        xSize=input_data.shape[3]
    roiSize['z']=zSize
    roiSize['y']=ySize
    roiSize['x']=xSize
    roiCoordInfo['roisize'] = roiSize
    roiArr = []
    for rc in roiCoordinates:
        roi = {}
        roi['z'] = rc[0][0]
        roi['y'] = rc[1][0]
        roi['x'] = rc[2][0]
        roiArr.append(roi)
    roiCoordInfo['roi'] = roiArr
    roiCoordInfoJson = json.dumps(roiCoordInfo)
    roiCoordKey = image['outputKeyPrefix'] + '.json'
    s3c.put_object(Body=roiCoordInfoJson, Bucket=image['outputBucket'], Key=roiCoordKey)
    
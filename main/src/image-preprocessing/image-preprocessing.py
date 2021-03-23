import sys
import os
import traceback
import boto3
import numpy as np
import io
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

import bioimageimage as bi
import bioimagepath as bp
import bioims

print("Args=")
print(sys.argv[1:])
print("==")


# """
# This script takes as input a multi-channel image and computes ROIs within that image
# using an approach designed for isolation biological cells. To find cell centers, it uses a single channel
# assumed to have good single/noise for cell nuclei. Having identified the center
# of each cell, it crops across all channels at that location and creates a mulit-channel
# numpy array of the cropped data.

# Basic steps for this process include:
# 1. Use of a flat-field background image to normalize the source image
# 2. Use of a logorithmic normalization function to better distribute variance across the intensity range
# 3. Use of traditional methods for identifying cell centers (e.g., Otsu's method and dialtion/erosion)

# Edge-case handling for cell centers is handled as follows:

# The size for the ROI is specified, which is uniformly applied to each dimension. Edge handling can be considered in three different cases.
# 'r' is the roisize, and r/2 is half of roisize.

# Case 1: the dimension is much larger than ROI size:

#     If the entire ROI does not fit (i.e., if the center is closer than r/2 to the edge, then the ROI is discarded).
    
# Case 2: the dimension is smaller than the ROI size:

#     Then the generated ROI object is simply limited in this dimension to the maximum size, and includes the full range, regardless of where the 
#     center is in that dimension.
    
# Case 3: the dimension is slightly larger than the ROI size:

#     Then the generated ROI object is full-size, but the effective center is shifted to accomplish this. The "maximum shift" will be computed
#     as follows: min( (r - DimSize/4), 0)

# The input is an imageId, from which any needed metadata can be obtained via the bioims tool.

# The output has two components:

#     1) a numpy array with all ROIs for a given image, each of which in turn is a multi-channel data structure

#     2) a json file listing the ROI coordinates for each ROI image wrt its source image

# The above output is generated for each image in the input manifest.

# Output ROI coordinate example:

# {
#     roisize: { // channel, z, y, x
#         z: xxx,
#         y: xxx,
#         x: xxx
#     },
#     roi: [ 
#         {
#             z: xxx,
#             y: xxx,
#             x: xxx
#         }
#     ]
# }

# """

# Example imageInfo:
    
#     {'Item': 
#         {'trainCategory': 'moa', 
#         'imageId': '115kKdtCLvJ9HodXCQDrU6', 
#         'plateId': 'bWb5wnbxsPPUyTVhfjV8Wh', 
#         'trainId': 'origin', 
#         'depth': '1', 
#         'plateSourceId': 'Week1_22401', 
#         'bucket': 'bioimagesearchbbbc021stack-bbbc021bucket544c3e64-10ecnwo51127', 
#         'experiment': 'BBBC021_v1', 
#         'channelKeys': [
#             {'name': 'dapi', 'keysuffix': 'Week1_22401/Week1_150607_G09_s3_w1F733F5D1-A112-40AD-B324-46E9D649D7B6.tif'}, 
#             {'name': 'tubulin', 'keysuffix': 'Week1_22401/Week1_150607_G09_s3_w2C3850DE6-AF1C-4E87-B434-F67337C6BF5C.tif'}, 
#             {'name': 'actin', 'keysuffix': 'Week1_22401/Week1_150607_G09_s3_w4413C1A1A-408E-4C10-8B4E-75BA019F4815.tif'}], 
#         'wellId': 'oMKATjf4z3b6kxnsHtaajV', 
#         'imageSourceId': 'Week1_150607_G09_s3_w1F733F5D1-A112-40AD-B324-46E9D649D7B6', 
#         'messageId': 'a725deab-2417-4b7a-958a-fc215aa49292', 
#         'searchReady': 'VALIDATED', 
#         'height': '1024', 
#         'width': '1280', 
#         'wellSourceId': 'G09', 
#         'channels': '3', 
#         'key': '', 
#         'createTimestamp': '1608160666210'
#         }
#     }

CONFIG_ROI_SIZE = "image-preprocessing-roi-size"
CONFIG_MIN_VOXELS = "image-preprocessing-min-voxels"

parser = argparse.ArgumentParser()

parser.add_argument('--region', type=str, help='AWS region')
parser.add_argument('--bucket', type=str, help='artifact bucket')
parser.add_argument('--imageId', type=str, help='imageId to process')
parser.add_argument('--embeddingName', type=str, help='Embedding name')
parser.add_argument('--describeStacks', type=str, help='Describe Stacks JSON', default='')

args = parser.parse_args()

print("region={} bucket={} imageId={} embeddingName={}".format(args.region, args.bucket, args.imageId, args.embeddingName))

hasDescribeStacks=False
if len(args.describeStacks) > 0:
    hasDescribeStacks=True
    print("describeStacks={}".format(args.describeStacks))

os.environ['AWS_DEFAULT_REGION'] = args.region

s3c = boto3.client('s3')

if hasDescribeStacks:
    params = {
        "bucket" : args.bucket,
        "key" : args.describeStacks
    }
    imageManagementClient = bioims.client('image-management', params)
    configurationClient = bioims.client('configuration', params)
    labelClient = bioims.client('label', params)
else:
    imageManagementClient = bioims.client('image-management')
    configurationClient = bioims.client('configuration')
    labelClient = bioims.client('label')

imageInfo1 = imageManagementClient.getImageInfo(args.imageId, "origin")
imageInfo = imageInfo1['Item']

isLabeled = False
if 'trainLabel' in imageInfo:
    isLabeled = True

roisize = int(configurationClient.getParameter(CONFIG_ROI_SIZE))
minvoxels = int(configurationClient.getParameter(CONFIG_MIN_VOXELS))
segmentationChannelName = 'dapi'

# trainKey   = "artifact/train/" + args.embeddingName + "/plate/" + imageInfo['plateId'] + "/image-" + args.imageId + "-train.npy"
# labelKey   = "artifact/train/" + args.embeddingName + "/plate/" + imageInfo['plateId'] + "/image-" + args.imageId + "-label.npy"
# noLabelKey = "artifact/train/" + args.embeddingName + "/plate/" + imageInfo['plateId'] + "/image-" + args.imageId + "-label.NONE"
# roiKey     = "artifact/train/" + args.embeddingName + "/plate/" + imageInfo['plateId'] + "/image-" + args.imageId + "-roi.json"

trainKey   = bp.getTrainKey(args.embeddingName, imageInfo['plateId'], args.imageId)
labelKey   = bp.getLabelKey(args.embeddingName, imageInfo['plateId'], args.imageId)
noLabelKey = bp.getNoLabelKey(args.embeddingName, imageInfo['plateId'], args.imageId)
roiKey     = bp.getRoiKey(args.embeddingName, imageInfo['plateId'], args.imageId)

if (bi.s3ObjectExists(args.bucket, trainKey) and 
    bi.s3ObjectExists(args.bucket, roiKey) and 
    (bi.s3ObjectExists(args.bucket, labelKey) or bi.s3ObjectExists(args.bucket, noLabelKey))):
        print("All files exist - skipping")
        sys.exit(0)

width = int(imageInfo['width'])
height = int(imageInfo['height'])
depth = int(imageInfo['depth'])

labelIndex = -1

if isLabeled:
    labelDict = {}
    labelList = labelClient.listLabels(imageInfo['trainCategory'])
    for lc in labelList:
        labelDict[lc[0]]=lc[1]
    labelIndex = int(labelDict[imageInfo['trainLabel']])

def getFlatFieldKeyForChannel(channelName):
    return bp.getFlatFieldKeyForChannel(imageInfo['plateId'], args.embeddingName, channelName)

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
        # Skip background
        if (lp!=0):
            if (labelCounts[lp]>=minvoxels):
                ca = []
                ca.append(lp)
                ca.append(labelCounts[lp])
                for d in range(len(labels.shape)):
                    na = labelPositions[d]
                    ca.append(na[lp]/labelCounts[lp])
                centers.append(ca)
    return centers    

def computeCellCenters(pixels):
    if pixels.min()==pixels.max():
        return []
    otsuThreshold = threshold_otsu(pixels)
    binaryPixels = pixels >= otsuThreshold
    ed1=binary_opening(binaryPixels)
    ed2=binary_opening(ed1)
    ed2int = ed2.astype(np.int)
    ed2Labels, labelCount = nd.label(ed2int)
    centers=findCentersFromLabels(ed2Labels)
    return centers
        
inputChannels = imageInfo['channelKeys']

# Initialize vars
normedImages = {}
pix_shape = []
input_arr = []
segment_index = 0
i=0
    
# For each channel, do an initial linear normalizations, and find the segmentation channel index
inputBucket = imageInfo['bucket']
flatFieldData = []
for inputChannel in inputChannels:
    channelFullKey = imageInfo['key'] + inputChannel['keysuffix']
    normedImage = bi.computeNormedImage(inputBucket, channelFullKey)
    pix_shape.append(normedImage.shape)
    input_arr.append(normedImage)
    if inputChannel['name']==segmentationChannelName:
        segment_index=i
    flatFieldKey = getFlatFieldKeyForChannel(inputChannel['name'])
    flatFieldData1 = bi.getNumpyArrayFromS3(args.bucket, flatFieldKey)
    if len(flatFieldData1.shape)==2:
        flatFieldData1 = np.expand_dims(flatFieldData1, axis=0)
    fmin = flatFieldData1.min()
    fmax = flatFieldData1.max()
    flatFieldData.append(flatFieldData1)
    i+=1

if not bi.checkPixShape(pix_shape):
    sys.exit("Error: image shapes of channels do not match")
        
# For each channel, independently do logarithmic normalization using its flatfield image
input_data = np.array(input_arr)
for c in range(input_data.shape[0]):
    flatFieldImage = flatFieldData[c]
    channelData = input_data[c]
    h1 = histogram(channelData, 100)
    pc2 = bi.findHistCutoff(h1, 0.99)
    bi.applyImageCutoff(channelData, pc2)
    bi.normalizeChannel(flatFieldImage, channelData)

# Find ROIs
centers = computeCellCenters(input_data[segment_index])

# Construct shape tuple to create np array for roi data
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
    
# Add ROI centers, but validate and modify if needed for dimension boundary
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
        
# Write the ROI image data
#roiKey = image['outputKeyPrefix'] + '.npy'
roiData *= 65535.0
roiData16 = roiData.astype(np.uint16)
if count>0:
    roiDataMin=np.min(roiData)
    roiDataMax=np.max(roiData)
    roiData16Min = np.min(roiData16)
    roiData16Max = np.max(roiData16)
    print("min={} max={} min16={} max16={}".format(roiDataMin, roiDataMax, roiData16Min, roiData16Max))
bi.writeNumpyToS3(roiData16[:count], args.bucket, trainKey)
    
# Construct and write the ROI json file
roiCoordInfo = {}

roiSize = {}
zSize=roisize
if (depth<roisize):
    zSize=depth
    
ySize=roisize
if (height<roisize):
    ySize=height
    
xSize=roisize
if (width<roisize):
    xSize=width
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
s3c.put_object(Body=roiCoordInfoJson, Bucket=args.bucket, Key=roiKey)

# Example typing for train/label data:
#
#trainData = np.zeros((bufferSize, CHANNELS, HW, HW), dtype=np.uint16)
#labelData = np.zeros(bufferSize, dtype=np.int32)

# Label output
if isLabeled:
    labelNpy = np.zeros(count, dtype=np.int32)
    for l in range(count):
        labelNpy[l] = labelIndex
    bi.writeNumpyToS3(labelNpy, args.bucket, labelKey)
else:
    noLabelMessage = "No label data"
    s3c.put_object(Body=noLabelMessage, Bucket=args.bucket, Key=noLabelKey)
    
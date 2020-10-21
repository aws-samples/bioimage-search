import sys
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
                    flatFieldKey: xxx
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

def getManifestFromS3():
    return bi.loadJsonObjectFromS3(args.imageManifestKey, args.imageManifestBucket)
    
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

flatFieldDataDict = {}

# For each image we normalize, find centers, and extract ROI data
for image in images:

    # Initialize vars
    normedImages = {}
    inputChannelBucket = image['inputChannelBucket']
    inputFlatfieldBucket = image['inputFlatfieldBucket']
    inputChannels = image['inputChannels']
    segmentationChannelName = image['segmentationChannelName']
    pix_shape = []
    input_arr = []
    segment_index = 0
    i=0
    
    # For each channel, do an initial linear normalizations, and find the segmentation channel index
    flatFieldData = []
    for inputChannel in inputChannels:
        normedImage = bi.computeNormedImage(
            inputChannelBucket,
            inputChannel['imageKey'])
        pix_shape.append(normedImage.shape)
        input_arr.append(normedImage)
        if inputChannel['name']==segmentationChannelName:
            segment_index=i
        flatFieldKey = inputChannel['flatFieldKey']
        if flatFieldKey in flatFieldDataDict:
            flatFieldData.append(flatFieldDataDict[flatFieldKey])
        else:
            flatFieldData1 = bi.getNumpyArrayFromS3(inputFlatfieldBucket, flatFieldKey)
            if len(flatFieldData1.shape)==2:
                flatFieldData1 = np.expand_dims(flatFieldData1, axis=0)
            fmin = flatFieldData1.min()
            fmax = flatFieldData1.max()
            flatFieldDataDict[flatFieldKey] = flatFieldData1
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
    roiKey = image['outputKeyPrefix'] + '.npy'
    bi.writeNumpyToS3(roiData[:count], image['outputBucket'], roiKey)
    
    # Construct and write the ROI json file
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
    
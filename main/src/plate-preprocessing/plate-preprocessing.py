import sys
import os
import boto3
import pandas as pd
import numpy as np
import io
import re
import argparse
from PIL import Image
from skimage import io
from skimage.filters import gaussian
from skimage.exposure import histogram
import math
from pathlib import Path
from io import StringIO, BytesIO
import shortuuid as su
import bioimageimage as bi
import bioims

print("Args=")
print(sys.argv[1:])
print("Done args")

##################################################################################
#
# This script computes the flat-field background image from a set of source images.
# The typical use case is a multiwell plate from which one or more images where taken
# from each well. The flat field then describes the background image for the imaging 
# system. A separate flat-field image is typically computed separately for each channel,
# as it is in this case.

# Output from this step has the following s3 path structure in the target artifact bucket:
#
#       <bucket>/artifact/plate/<plateid>/<embeddingName>/<artifact-key>
#
# Where <artifact-key> has this structure:
#
#       channel-<channel-name>-flatfield.npy
#
# Corresponding entries are made in the artifact table.
#
##################################################################################

parser = argparse.ArgumentParser()

parser.add_argument('--region', type=str, help='AWS region')
parser.add_argument('--bucket', type=str, help='Bucket name for artifacts')
parser.add_argument('--plateId', type=str, help='plateId')
parser.add_argument('--embeddingName', type=str, help='embeddingName')

args = parser.parse_args()

print("region={} bucket={} plateId={} embeddingName={}".format(args.region, args.bucket, args.plateId, args.embeddingName))

os.environ['AWS_DEFAULT_REGION'] = args.region

s3c = boto3.client('s3')

imageManagementClient = bioims.client('image-management')

imlist = imageManagementClient.getImagesByPlateId(args.plateId)

channelImages = {}

for image in imlist:
    item = image['Item']
    imageBucket = item['bucket']
    imageKeyPrefix = item['key']
    channelKeys = item['channelKeys']
    for channel in channelKeys:
        name = channel['name']
        keysuffix = channel['keysuffix']
        fullpath = (imageBucket, imageKeyPrefix + keysuffix)
        if name in channelImages:
            channelImages[name].append(fullpath)
        else:
            imageArr = []
            imageArr.append(fullpath)
            channelImages[name]=imageArr
            
def computePlateArtifacts(channelName, imageArr, bucket, plateId, embeddingName):
    flatFieldKey = "artifact/plate/" + plateId + "/" + embeddingName + "/channel-" + channelName + "-flatfield.npy"
    if bi.s3ObjectExists(bucket, flatFieldKey):
        print("FlatfieldKey already exists, skipping bucket={} key={}".format(bucket, flatFieldKey))
        return
    else:
        print("FlatfieldKey does not exist, computing bucket={} key={}".format(bucket, flatFieldKey))

    plateImgArr=[]

    for imageBucket, imageKey in imageArr:
        print("Loading bucket={} key={}".format(imageBucket, imageKey))
        imageObject = s3c.get_object(Bucket=imageBucket, Key=imageKey)
        file_stream = imageObject['Body']
        im = Image.open(file_stream)
        pix = np.array(im)
        plateImgArr.append(pix)

    print("Computing flat field image")
    npAllImages=np.array(plateImgArr).astype(np.float32)
    npAllImages = npAllImages / 65536.0

    s1 = npAllImages.shape
    s2 = s1[1:]

    npAvg = np.zeros(shape=s2, dtype=np.float32);

    for ni in range(npAllImages.shape[0]):
        npAvg = npAvg+(npAllImages[ni]/(npAllImages.shape[0]))

    h1 = histogram(npAvg, 100)

    pcut = bi.findHistCutoff(h1, 0.30)

    bi.applyImageCutoff(npAvg, pcut)

    g1 = gaussian(npAvg, 50)

    image_type = flatFieldKey[-3:]
    tmpDir = bi.getTmpDir()
    fn = tmpDir + '/' + su.uuid() + '.' + image_type

    if image_type.lower() == 'npy':
        with open(fn, 'wb') as f:
            np.save(f, g1)
        with open(fn, 'rb') as fdata:
            print("s3c.upload_fileobj: bucket={} flatFieldKey={}".format(bucket, flatFieldKey))
            s3c.upload_fileobj(fdata, bucket, flatFieldKey)
            
    else:
        max1=np.max(g1)
        min1=np.min(g1)
        g1 = (g1-min1)/(max1-min1)
        img=Image.fromarray(g1)
        img.save(fn)
        with open(fn, 'rb') as fdata:
            s3c.upload_fileobj(fdata, bucket, flatFieldKey)

    artifactClient = bioims.client('artifact')
    artifactKey = "s3key#" + flatFieldKey
    artifact = {
        "contextId" : args.plateId,
        "trainId" : "origin",
        "artifact" : artifactKey
    }
    artifactClient.createArtifact(artifact)
            
    fnPath = Path(fn)
    fnPath.unlink()
    tPath = Path(tmpDir)
    tPath.rmdir()
            
for channelName, imageArr in channelImages.items():
    computePlateArtifacts(channelName, imageArr, args.bucket, args.plateId, args.embeddingName)
    
    

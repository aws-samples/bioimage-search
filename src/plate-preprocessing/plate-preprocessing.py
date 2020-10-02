import sys
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

# Image file list format:
# <bucket> <key>
# ...

parser = argparse.ArgumentParser()

parser.add_argument('--imageListBucket', type=str, default='', help='bucket for image list')
parser.add_argument('--imageListkey', type=str, default='', help='key for image list')
parser.add_argument('--flatFieldBucket', type=str, default='', help='bucket for flat field result')
parser.add_argument('--flatFieldKey', type=str, default='', help='key for flat field result')

args = parser.parse_args()

if len(args.imageListBucket) < 1 or\
    len(args.imageListKey) < 1 or\
    len(args.flatFieldBucket) < 1 or\
    len(args.flatFieldKey) < 1:
    print(args.usage)    
    exit(1)

s3c = boto3.client('s3')

def getImageListFromS3(bucket, key):
    fileObject = s3c.get_object(Bucket=args.imageListBucket, Key=args.imageListKey)
    text = fileObject['Body'].read().decode('utf-8')
    objectStringList = text.splitlines()
    objectList=[]
    for objectString in objectStringList:
        bucket, key = re.split('\s+', objectString)
        objectList.append((bucket, key))        
    return objectList
    
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
    d0=nda.shape[0]
    d1=nda.shape[1]
    for i0 in range(d0):
        for i1 in range(d1):
            v0=nda[i0][i1]
            if (v0>cv):
                nda[i0][i1]=cv

imageObjectList = getImageListFromS3(args.imageListBucket, args.imageListKey)

plateImgArr=[]

for bucket, key in imageObjectList:
    print("Loading bucket={} key={}".format(bucket, key))
    imageObject = s3c.get_object(Bucket=bucket, Key=key)
    file_stream = imageObject['Body']
    im = Image.open(file_stream)
    pix = np.array(im)
    plateImgArr.append(pix)

print("Computing flat field image")

npAllImages=np.array(plateImgArr).astype(np.float32)

npAllImages = npAllImages / 65536.0

npAvg = np.zeros(shape=(npAllImages.shape[1],npAllImages.shape[2]), dtype=np.float32);

for ni in range(npAllImages.shape[0]):
    npAvg = npAvg+(npAllImages[ni]/(npAllImages.shape[0]))

h1 = histogram(npAvg, 100)

pcut = findHistCutoff(h1, 0.30)

applyImageCutoff(npAvg, pcut)

g1 = gaussian(npAvg, 50)

img=Image.fromarray(g1)
image_type = args.flatFieldKey[-3:]

buffer = BytesIO()
img.save(buffer, format=image_type)
buffer.seek(0)
s3c.upload_fileobj(buffer, args.flatFieldBucket, args.flatFieldKey)

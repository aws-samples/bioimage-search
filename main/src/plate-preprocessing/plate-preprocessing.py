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
import shortuuid as su

# Image file list format:
# <bucket> <key>
# ...

parser = argparse.ArgumentParser()

parser.add_argument('--imageListBucket', type=str, help='bucket for image list')
parser.add_argument('--imageListKey', type=str, help='key for image list')
parser.add_argument('--flatFieldBucket', type=str, help='bucket for flat field result')
parser.add_argument('--flatFieldKey', type=str, help='key for flat field result')

args = parser.parse_args()

s3c = boto3.client('s3')

tmpDir="/tmp"

ec2homePath=Path("/home/ec2-user")
if ec2homePath.exists():
    tmpDir="/home/ec2-user/tmp"

tmpPath=Path(tmpDir)
if not tmpPath.exists():
    tmpPath.mkdir()

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
    for idx, v in np.ndenumerate(nda):
        if (v>cv):
            nda[idx]=cv
            
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

s1 = npAllImages.shape
s2 = s1[1:]

npAvg = np.zeros(shape=s2, dtype=np.float32);

for ni in range(npAllImages.shape[0]):
    npAvg = npAvg+(npAllImages[ni]/(npAllImages.shape[0]))

h1 = histogram(npAvg, 100)

pcut = findHistCutoff(h1, 0.30)

applyImageCutoff(npAvg, pcut)

g1 = gaussian(npAvg, 50)

image_type = args.flatFieldKey[-3:]
fn = tmpDir + '/' + su.uuid() + '.' + image_type

if image_type.lower() == 'npy':
    with open(fn, 'wb') as f:
        np.save(f, g1)
    with open(fn, 'rb') as fdata:
        s3c.upload_fileobj(fdata, args.flatFieldBucket, args.flatFieldKey)
else:
    max1=np.max(g1)
    min1=np.min(g1)
    g1 = (g1-min1)/(max1-min1)
    img=Image.fromarray(g1)
    img.save(fn)
    with open(fn, 'rb') as fdata:
        s3c.upload_fileobj(fdata, args.flatFieldBucket, args.flatFieldKey)
        
fnPath = Path(fn)
fnPath.unlink()

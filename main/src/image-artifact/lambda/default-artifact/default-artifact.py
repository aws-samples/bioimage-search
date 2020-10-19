import math
import os
from io import StringIO, BytesIO
import boto3
from PIL import Image
import numpy as np
from skimage.exposure import histogram
import sys

import bioimageimage as bi

def handler(event, context):
    s3c = boto3.client('s3')
    input_bucket = event['input_bucket']
    input_keys = event['input_keys']
    artifact_keys = event['artifact_keys']
    artifact_sizes = event['artifact_sizes']
    
    input_data = []

    if len(input_keys)==0:
        return {
            'success' : "False",
            'errorMsg' : "one or more input keys required"
        }
        
    if len(artifact_keys)==0:
        return {
            'success' : "False",
            'errorMsg' : "one or more artifact_keys required"
        }

    if len(artifact_sizes)!=len(artifact_keys):
        return {
            'success' : "False",
            'errorMsg' : "each artifact_key must have corresponding artifact_size"
        }
        
    elif len(input_keys)==1:
        input_key = input_keys[0]
        fileObject = s3c.get_object(Bucket=input_bucket, Key=input_key)
        file_stream = fileObject['Body']
        im = Image.open(file_stream)
        input_data = np.array(im)
        if len(input_data.shape)==2:
            input_data = np.expand_dims(input_data, axis=0)
        
    else:
        input_arr = []
        input_shape = []
        for input_key in input_keys:
            fileObject = s3c.get_object(Bucket=input_bucket, Key=input_key)
            file_stream = fileObject['Body']
            im = Image.open(file_stream)
            pix = np.array(im)
            input_shape.append(pix.shape)
            input_arr.append(pix)

        if not bi.checkPixShape(input_shape):
            return {
                'success' : "False",
                'errorMsg' : "input channel dimensions do not match"
            }
            
        input_data = np.array(input_arr)
        
    print("input_data shape=", input_data.shape)
    input_data = bi.normImageData(input_data)
    
    for c in range(input_data.shape[0]):
        channelData = input_data[c]
        h1 = histogram(channelData, 100)
        bcut = bi.findHistCutoff(h1, 0.20)
        bavg = bi.findCutoffAvg(channelData, bcut)
        bi.normalizeChannel(bavg, channelData)
        
    ca = bi.getColors(input_data.shape[0])
    mip = bi.calcMip(input_data, ca)
    img=Image.fromarray(mip)

    output_bucket = event['output_bucket']
    
    height = input_data.shape[-2]
    width = input_data.shape[-1]
    for artifact_key, artifact_size in zip(artifact_keys, artifact_sizes):
        image_type = artifact_key[-3:]
        asize = float(artifact_size)
        if height > width:
            artifact_height = int(asize)
            artifact_width = int((width/height)*artifact_height)
        else:
            artifact_width = int(asize)
            artifact_height = int((height/width)*artifact_width)

        artifact_img = img.resize((artifact_width, artifact_height))
        artifact_buffer = BytesIO()
        artifact_img.save(artifact_buffer, format=image_type)
        artifact_buffer.seek(0)
        s3c.upload_fileobj(artifact_buffer, output_bucket, artifact_key)

    return { 
        'input_bucket' : event['input_bucket'],
        'input_keys' : input_keys,
        'output_bucket' : event['output_bucket'],
        'artifact_keys' : artifact_keys,
        'artifact_sizes' : artifact_sizes
    }  
    
import math
import os
from io import StringIO, BytesIO
import boto3
from PIL import Image
import numpy as np
from skimage.exposure import histogram
import sys
import random
import time

import bioimageimage as bi
import bioims

CONFIG_SIZES_PARAM = "default-image-artifact-sizes"
CONFIG_KEYS_PARAM = "default-image-artifact-keys"

dataBucket = os.environ['DATA_BUCKET']
configurationLambdaArn = os.environ['CONFIGURATION_LAMBDA_ARN']
artifactLambdaArn = os.environ['ARTIFACT_LAMBDA_ARN']

def handler(event, context):
    s3c = boto3.client('s3')
    
    imageId = event['imageId']
    describeStacks = event['describeStacks']['Payload']['body']
    contextId = describeStacks['contextId']
    trainId = describeStacks['trainId']
    key = describeStacks['key']
   
    print("imageId={}".format(imageId))
    print("contextId={}".format(contextId))
    print("trainId={}".format(trainId))
    print("key={}".format(key))
    print("dataBucket={}".format(dataBucket))
    
######################################    

    describeStacksParams = {
        "bucket" : dataBucket,
        "key" : key
    }
    
    imageManagementClient = bioims.client('image-management', describeStacksParams)
    imageInfo = imageManagementClient.getImageInfo(imageId, "origin")
    
    configurationClient = bioims.client('configuration', describeStacksParams)
    
    artifactClient = bioims.client('artifact', describeStacksParams)

    sizesStr = configurationClient.getParameter(CONFIG_SIZES_PARAM)
    artifact_sizes = sizesStr.split(',')
    
    keysStr = configurationClient.getParameter(CONFIG_KEYS_PARAM)
    artifact_keys = keysStr.split(',')

# artifact/plate/<plate>/default/image/<imageId>/<key>.tif


    # {'Item': 
    #     {   'trainCategory': 'moa', 
    #         'imageId': 'ecG7rUcJL2asM4AvoEmom9', 
    #         'plateId': 'bWb5wnbxsPPUyTVhfjV8Wh', 
    #         'trainId': 'origin', 
    #         'depth': '1', 
    #         'plateSourceId': 'Week1_22401', 
    #         'bucket': 'bioimagesearchbbbc021stack-bbbc021bucket544c3e64-10ecnwo51127', 
    #         'experiment': 'BBBC021_v1', 
    #         'channelKeys': [
    #             {'name': 'dapi', 
    #             'keysuffix': 'Week1_22401/Week1_150607_G11_s4_w1FD01EB31-90F9-4856-AD6B-B5160E2C5BA3.tif'}, 
    #             {'name': 'tubulin', 
    #             'keysuffix': 'Week1_22401/Week1_150607_G11_s4_w2E853D1E6-2637-488D-829C-D6AB6AD8A2E2.tif'}, 
    #             {'name': 'actin', 'keysuffix': 'Week1_22401/Week1_150607_G11_s4_w4768D7DAA-05D3-48FA-9223-954979D8C802.tif'}
    #             ], 
    #         'wellId': 'amTSiU11M5knT9DKvgtmm5', 
    #         'imageSourceId': 'Week1_150607_G11_s4_w1FD01EB31-90F9-4856-AD6B-B5160E2C5BA3', 
    #         'messageId': '0e366bc9-ab55-4eeb-9d79-9f661e3ce712', 
    #         'searchReady': 'VALIDATED', 
    #         'height': '1024', 
    #         'width': '1280', 
    #         'wellSourceId': 'G11', 
    #         'channels': '3', 
    #         'trainLabel': 'DMSO', 
    #         'key': '', 
    #         'createTimestamp': '1608160666210'
    #     }
    # }

######################################    

    plateId = imageInfo['Item']['plateId']

    input_bucket = imageInfo['Item']['bucket']
    
    input_keys = []
    keyPrefix = imageInfo['Item']['key']
    channelKeys = imageInfo['Item']['channelKeys']
    for channel in channelKeys:
        fullKey = keyPrefix + channel['keysuffix']
        input_keys.append(fullKey)
        
    artifact_key_prefix = "artifact/plate/{}/default/image/{}/".format(plateId, imageId)

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

    bavgFill = np.zeros(shape=input_data[0].shape, dtype=input_data.dtype)
    for c in range(input_data.shape[0]):
        channelData = input_data[c]
        h1 = histogram(channelData, 100)
        bcut = bi.findHistCutoff(h1, 0.20)
        bavg = bi.findCutoffAvg(channelData, bcut)
        bavgFill.fill(bavg)
        bi.normalizeChannel(bavgFill, channelData)
        
    ca = bi.getColors(input_data.shape[0])
    mip = bi.calcMip(input_data, ca)
    img=Image.fromarray(mip)

    height = input_data.shape[-2]
    width = input_data.shape[-1]
    for artifact_key, artifact_size in zip(artifact_keys, artifact_sizes):
        artifactFullKey = artifact_key_prefix + artifact_key
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
        s3c.upload_fileobj(artifact_buffer, dataBucket, artifactFullKey)
        artifactTableKey = "s3key#" + artifactFullKey
        artifact = {
            "contextId" : imageId,
            "trainId" : "origin",
            "artifact" : artifactTableKey
        }
        artifactClient.createArtifact(artifact)

    return imageId; 
    
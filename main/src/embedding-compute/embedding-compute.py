import sys
import io
import tarfile
from pathlib import Path
import os as os
from os import listdir
import boto3
import json
import base64
import shortuuid as su
import bioimagepath as bp
import bioims
import sagemaker
from sagemaker.pytorch import PyTorch
from sagemaker.inputs import FileSystemInput
import torch
import torchvision
import torchvision.transforms as transforms
import numpy as np
import torch.nn as nn
import torch.nn.functional as F
import torch.optim as optim
from torch.utils.data import TensorDataset, DataLoader
from time import time
from s3fs.core import S3FileSystem


MESSAGE_LAMBDA_ARN = os.environ['MESSAGE_LAMBDA_ARN']
IMAGE_MANAGEMENT_LAMBDA_ARN = os.environ['IMAGE_MANAGEMENT_LAMBDA_ARN']
TRAINING_CONFIGURATION_LAMBDA_ARN = os.environ['TRAINING_CONFIGURATION_LAMBDA_ARN']
ARTIFACT_LAMBDA_ARN = os.environ['ARTIFACT_LAMBDA_ARN']
BUCKET = os.environ['BUCKET']

"""
Steps:

1. Inputs include:
    a. trainInfo json, injected (obtained from trainId at higher level)
    b. embeddingInfo json, injected (obtained from trainId->embeddingName at higher level)
    c. plateId
    d. imageId
2. From the trainInfo, get:
    a. trainingScriptKey
    b. trainingScriptBucket
    c. trained model key
    d. trained model bucket
3. Using the bioimagepath module, get:
    a. trainKey (to ROI images)
4. Load ROI images to numpy array
5. If the trained model is not already in /tmp, load the trained model
    a. implement a unique path mechanism to support multiple models
6. Apply ROI images to model and compute output w/ PyTorch
7. Calculate the average embedding from the ROI embedding array
    a. Check the method vs literature
8. Save the output embedding array to DDB image table (using imageId/trainId composite key), as a binary numpy array under pickle and then base64 encoded
9. Save the average embedding (i.e., the image embedding) as a base64-encoded numpy array, to (imageId/trainId) in image table

"""

s3c = boto3.client('s3')
s3f = S3FileSystem()
smc = boto3.client('sagemaker')   
lam = boto3.client('lambda')

def copyS3ObjectPathToLocalPath(s3path, localPath):
    bucket = s3path[5:].split('/')[0]
    key = s3path[(len(bucket)+6):]
    s3c.download_file(bucket, key, localPath)
    
def getNumpyArrayFromS3(bucket, key):
    nparr = np.load(s3f.open('{}/{}'.format(bucket, key)))
    return nparr    
    
def writeNumpyToS3(data_array, bucket, keyPath):
    keySuffix=keyPath.split('/')[-1]
    fn = '/tmp/' + keySuffix
    np.save(fn, data_array)
    with open(fn, 'rb') as fdata:
        s3c.upload_fileobj(fdata, bucket, keyPath)
    fnPath=Path(fn)
    fnPath.unlink()
    
def createArtifact(artifact):
    artifactStr = json.dumps(artifact)
    request = '{{ "method": "createArtifact", "artifact": {} }}'.format(artifactStr)
    payload = bytes(request, encoding='utf-8')
    response = lam.invoke(
        FunctionName=ARTIFACT_LAMBDA_ARN,
        InvocationType='RequestResponse',
        Payload=payload
        )
        
def applyEmbeddingResult(imageId, trainId, embeddingVector, roiEmbeddingKey):
    request = '{{ "method": "createImageTrainResult", "imageId": "{}", "trainId": "{}", "embeddingVector": "{}", "roiEmbeddingKey": "{}" }}'.format(imageId, trainId, embeddingVector, roiEmbeddingKey)
    payload = bytes(request, encoding='utf-8')
    response = lam.invoke(
        FunctionName=IMAGE_MANAGEMENT_LAMBDA_ARN,
        InvocationType='RequestResponse',
        Payload=payload
        )

def handler(event, context):
    trainInfo = event['trainInfo']
    embeddingInfo = event['embeddingInfo']
    embeddingName = embeddingInfo['embeddingName']
    trainId = trainInfo['trainId']
    plateId = event['plateId']
    imageId = event['imageId']
    print(trainInfo)
    print(embeddingInfo)
    print(embeddingName)
    print(plateId)
    print(imageId)
    trainingScriptBucket=embeddingInfo['modelTrainingScriptBucket']
    trainingScriptKey=embeddingInfo['modelTrainingScriptKey']
    trainingJobName=trainInfo['sagemakerJobName']
    print(trainingScriptBucket)
    print(trainingScriptKey)
    print(trainingJobName)
 
    trainingJobInfo = smc.describe_training_job(
        TrainingJobName=trainingJobName
    )
    modelArtifacts=trainingJobInfo['ModelArtifacts']
    s3ModelPath=modelArtifacts['S3ModelArtifacts']
    print(s3ModelPath)
    
    localModelDir = os.path.join('/tmp/',trainingJobName)
    localModelGz = os.path.join(localModelDir, 'model.tar.gz')
    if os.path.isdir(localModelDir):
        print("Local dir {} already exists, assuming model is present".format(localModelDir))
    else:
        print("Creating {} and downloading model.tar.gz".format(localModelDir))
        os.mkdir(localModelDir)
        copyS3ObjectPathToLocalPath(s3ModelPath, localModelGz)
        os.chdir(localModelDir)
        tar = tarfile.open("model.tar.gz")
        tar.extractall()
        tar.close()

    localTrainScript = os.path.join(localModelDir, 'bioimstrain.py')
    if os.path.isfile(localTrainScript):
        print("Using train script {}".format(localTrainScript))
    else:
        print("Downloading trainscript from bucket={} key={}".format(trainingScriptBucket, trainingScriptKey))
        s3c.download_file(trainingScriptBucket, trainingScriptKey, localTrainScript)

    os.chdir(localModelDir)
    sys.path.insert(0, ".")
    import bioimstrain
    model=bioimstrain.model_fn(localModelDir)
    print(model)
    
    roiTrainKey = bp.getTrainKey(embeddingName, plateId, imageId)
    data = getNumpyArrayFromS3(BUCKET, roiTrainKey).astype(np.float32)
    print(data.shape)
    
    ##########################################################################
    # TODO: Handle 3D data 
    #
    # The dev model assumes input with 4 dimensions. It assumes 2D rather then 3D data, with 3 channels:
    #    image#, channels, y, x 
    #  
    # With channels=3, x and y = 128
    #
    # However, actual input is 3D and will be <#>, 3, 1, 128, 128
    #
    ##########################################################################
    
    #dataDimArr = [data.shape[0], 3, 128, 128]
    print("v3")
    dataDimArr = [600, 3, 128, 128]
    dimTuple = tuple(dataDimArr)
    model_data = np.zeros(dimTuple, dtype=np.float32)
    for i in range(data.shape[0]):
        model_data[i][0]=data[i][0][0]
        model_data[i][1]=data[i][1][0]
        model_data[i][2]=data[i][2][0]
    
    print(model_data.shape)
    if data.shape[0] > 0:
        t1 = torch.tensor(model_data)
        print(t1.shape)
        embeddingDataTensor = model(t1)
        t2 = embeddingDataTensor.detach()
        embeddingData = t2.numpy()
        embeddingResult = embeddingData[:data.shape[0]]
        ea = np.mean(embeddingResult, axis=0)
        print(embeddingResult.shape)
        print(ea.shape)
        roiEmbeddingKey = bp.getRoiEmbeddingKey(imageId, plateId, trainId)
        writeNumpyToS3(embeddingResult, BUCKET, roiEmbeddingKey)
        artifactStr = 's3key#' + roiEmbeddingKey
        roiEmbeddingArtifact = {
            'contextId': imageId,
            'trainId': trainId,
            'artifact': artifactStr
        }
        createArtifact(roiEmbeddingArtifact)
        ea64 = base64.b64encode(ea)
        applyEmbeddingResult(imageId, trainId, ea64, roiEmbeddingKey)
        # de64 = base64.decodebytes(ea64)
        # ea2 = np.frombuffer(de64, dtype=np.float32)
        # isOk = np.allclose(ea, ea2)
        # print("base64 check={}".format(isOk))

    else:
        print("No input data found - skipping")

    response = {
        'statusCode': 200,
        'body': ea64
    }
    
    return response

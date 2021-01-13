import sys
import io
import tarfile
from pathlib import Path
import os as os
from os import listdir
import boto3
import json
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

# def usage():
#     print("usage: bbbc021-embed.py <platePrefix, e.g., Week2_24361>")
#     exit(1)

# tmpDir = '/tmp/' + str(uuid.uuid4())
# channels=3

# ###================================================================================
# sageMakerTrainingBucket = 'sagemaker-us-east-1-580829821648'
# modelKey = 'pytorch-training-2020-07-26-02-52-25-040/output/model.tar.gz'

# class Net(nn.Module): 
#     def __init__(self):
#         super(Net, self).__init__()
#         self.conv1 = nn.Conv2d(channels, 16, 3, stride=2)
#         self.conv2 = nn.Conv2d(16, 32, 3, stride=2)
#         self.conv3 = nn.Conv2d(32, 64, 3, stride=2)
#         self.conv4 = nn.Conv2d(64, 128, 3, stride=2)
#         self.conv5 = nn.Conv2d(128, 256, 3, stride=2)
#         self.pool1 = nn.AvgPool2d(kernel_size = 2, stride=0, padding=0, ceil_mode=False, count_include_pad=True)
#         self.fc1 = nn.Linear(256, 32)

#     def forward(self, x):
#         x = self.conv1(x)
#         x = F.relu(x)
#         x = self.conv2(x)
#         x = F.relu(x)
#         x = self.conv3(x)
#         x = F.relu(x)
#         x = self.conv4(x)
#         x = F.relu(x)
#         x = self.conv5(x)
#         x = F.relu(x)
#         x = self.pool1(x)
#         x = x.view(-1, 256)
#         x = self.fc1(x)
#         n = x.norm(p=2, dim=1, keepdim=True)
#         x = x.div(n)
#         return x

# ###================================================================================

# projectBucket = 'phis-experiment-tensorflow'
# projectEmbeddingKeyPrefix = 'embedding/bbbc021'

# bucket_source = 'phis-data-bbbc021-1'
# cell_key_prefix = 'cell-images'
# imageMetadataKey = 'BBBC021_v1_image.csv'
# moaKey = 'BBBC021_v1_moa.csv'
# compoundKey = 'BBBC021_v1_compound.csv'

# ec2homePath=Path("/home/ec2-user")
# if ec2homePath.exists():
#     tmpDir = '/home/ec2-user' + tmpDir

# tmpPath=Path(tmpDir)
# if not tmpPath.exists():
#     tmpPath.mkdir()

# tmpPath = str(tmpPath)
    
# if len(sys.argv) < 2:
#     usage()

# platePrefix=sys.argv[1]

# s3c = boto3.client('s3', region_name='us-east-1')

# def getCsvDfFromS3(bucket, key):
#     csvObject = s3c.get_object(Bucket=bucket, Key=key)
#     file_stream = csvObject['Body']
#     df = pd.read_csv(file_stream)
#     return df

# image_df = getCsvDfFromS3(bucket_source, imageMetadataKey)
# moa_df = getCsvDfFromS3(bucket_source, moaKey)
# compound_df = getCsvDfFromS3(bucket_source, compoundKey)

# moa_label_number_map = {}
# moa_unique_arr = moa_df['moa'].unique()
# moa_unique_arr.sort()
# for i, l in enumerate(moa_unique_arr):
#     moa_label_number_map[l] = i

# compound_moa_map = {}
# for i in moa_df.index:
#     r = moa_df.iloc[i]
#     compound = r['compound']
#     moa = r['moa']
#     compound_moa_map[compound] = moa

# train_key_label_map = {}
# for i in image_df.index:
#     image_row = image_df.iloc[i]
#     dapiFile = image_row['Image_FileName_DAPI']
#     dapiPath = image_row['Image_PathName_DAPI']
#     compound = image_row['Image_Metadata_Compound']
#     if compound in compound_moa_map:
#         moa = compound_moa_map[compound]
#         label = moa_label_number_map[moa]
#         dapiWeekPrefix = dapiPath.split('/')[1]
#         if dapiWeekPrefix == platePrefix:
#             sourceKey = cell_key_prefix + '/' + dapiWeekPrefix + '/' + dapiFile[:-4] + '-cell.npy'
#             train_key_label_map[sourceKey] = label

# def getNumpyArrayFromS3(bucket, key):
#     nparr = np.load(s3f.open('{}/{}'.format(bucket, key)))
#     return nparr

# def getNumpyByDownloadTmpFile(bucket, key):
#     tmpFile = tmpPath + '/' + str(uuid.uuid4()) + '.npy'
#     s3c.download_file(bucket, key, tmpFile)
#     nparr = np.load(tmpFile)
#     os.remove(tmpFile)
#     return nparr

# def copyS3ObjectPathToLocalPath(s3path, localPath):
#     bucket = s3path[5:].split('/')[0]
#     key = s3path[(len(bucket)+6):]
#     s3c.download_file(bucket, key, localPath)

# def getPytorchModelFromS3(modelDataS3Location):
#     print('Retrieving model from: ', modelDataS3Location)
#     localPath = tmpPath + '/model.tar.gz'
#     copyS3ObjectPathToLocalPath(modelDataS3Location, localPath)
#     tarCmd = 'cd ' + tmpPath + '; tar xf model.tar.gz'
#     os.system(tarCmd)
#     dl = listdir(tmpPath)
#     for d in dl:
#         if d != 'model.tar.gz':
#             path2=tmpPath + '/' + d
#             break
#     checkpoint = torch.load(path2)
#     model = Net()
#     model.load_state_dict(checkpoint)
#     return model

# def writeDictToS3(d, bucket, key):
#     keySuffix=key.split('/')[-1]
#     fn = tmpPath + '/' + keySuffix
#     with open(fn, 'wb') as handle:
#         pickle.dump(d, handle)
#     with open(fn, 'rb') as fdata:
#         s3c.upload_fileobj(fdata, bucket, key)
#     fnPath=Path(fn)
#     fnPath.unlink()

# modelPath = 's3://'+ sageMakerTrainingBucket + '/' + modelKey
# model = getPytorchModelFromS3(modelPath)

# embeddingMapByTrainKey = {}

# wellIndex=0
# total = len(train_key_label_map)
# buffer = np.zeros( (600, 3, 128, 128), dtype=np.float32 )
# for sourceKey in train_key_label_map:
#     print("Reading {} , {} of {}".format(sourceKey, wellIndex, total))
#     data = getNumpyByDownloadTmpFile(bucket_source, sourceKey).astype(np.float32)
#     if data.shape[0] > 0:
#         for j in range(data.shape[0]):
#             buffer[j] = data[j]
#         t1 = torch.tensor(buffer)
#         embeddingDataTensor = model(t1)
#         t2 = embeddingDataTensor.detach()
#         embeddingData = t2.numpy()
#         ea = np.mean(embeddingData[:data.shape[0]], axis=0)
#         embeddingMapByTrainKey[sourceKey] = ea
#     wellIndex += 1

# targetKey = projectEmbeddingKeyPrefix + '/' + platePrefix + '.pickle'
# writeDictToS3(embeddingMapByTrainKey, projectBucket, targetKey)

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

# def getS3TextObjectWriteToPath(bucket, key, path):
#     s3c = boto3.client("s3")
#     fileObject = s3c.get_object(Bucket=bucket, Key=key)
#     text = fileObject['Body'].read().decode('utf-8')
#     path_file = open(path, "w")
#     path_file.write(text)
#     path_file.close()

# def handler(event, context):
#     trainId = event['trainId']
#     uniqueId = su.uuid()
#     trainingConfigurationClient = bioims.client('training-configuration')
#     trainInfo = trainingConfigurationClient.getTraining(trainId)
#     embeddingName = trainInfo['embeddingName']
#     embeddingInfo = trainingConfigurationClient.getEmbeddingInfo(embeddingName)
#     trainScriptBucket = embeddingInfo['modelTrainingScriptBucket']
#     trainScriptKey =embeddingInfo['modelTrainingScriptKey']
#     trainListArtifactKey = bp.getTrainImageListArtifactPath(trainId)

#     responseInfo = {
#         'embeddingJobName': 'test1'
#     }

#     response = {
#         'statusCode': 200,
#         'body': responseInfo
#     }

#     return response

###############################################################################################



###############################################################################################

s3c = boto3.client('s3')
s3f = S3FileSystem()
smc = boto3.client('sagemaker')   

def copyS3ObjectPathToLocalPath(s3path, localPath):
    bucket = s3path[5:].split('/')[0]
    key = s3path[(len(bucket)+6):]
    s3c.download_file(bucket, key, localPath)
    
def getNumpyArrayFromS3(bucket, key):
    nparr = np.load(s3f.open('{}/{}'.format(bucket, key)))
    return nparr    

def handler(event, context):
    trainInfo = event['trainInfo']
    embeddingInfo = event['embeddingInfo']
    embeddingName = embeddingInfo['embeddingName']
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
    print("v1")
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
        ea = np.mean(embeddingData[:data.shape[0]], axis=0)
        print("Check0")
        print(embeddingData.shape)
        print("Check1")
        print(ea.shape)
        print("Check2")

    response = {
        'statusCode': 200,
        'body': 'success'
    }
    
    return response

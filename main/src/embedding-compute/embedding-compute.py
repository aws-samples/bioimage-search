import sys
import io
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

1. Get trainInfo and embeddingInfo
2. Determine the artifact path to the list of training prefix files
3. Determine the fsxl equivalent path
4. Create the estimator based on the assumption the training script is in the same dir
5. Pass the prefix list file path as a hyper-parameter to the training job
6. Start the SageMaker training job

"""

def getS3TextObjectWriteToPath(bucket, key, path):
    s3c = boto3.client("s3")
    fileObject = s3c.get_object(Bucket=bucket, Key=key)
    text = fileObject['Body'].read().decode('utf-8')
    path_file = open(path, "w")
    path_file.write(text)
    path_file.close()

def handler(event, context):
    trainId = event['trainId']
    uniqueId = su.uuid()
    trainingConfigurationClient = bioims.client('training-configuration')
    trainInfo = trainingConfigurationClient.getTraining(trainId)
    embeddingName = trainInfo['embeddingName']
    embeddingInfo = trainingConfigurationClient.getEmbeddingInfo(embeddingName)
    trainScriptBucket = embeddingInfo['modelTrainingScriptBucket']
    trainScriptKey =embeddingInfo['modelTrainingScriptKey']
    localTrainingScript = '/tmp/bioims-training-script.py'
    getS3TextObjectWriteToPath(trainScriptBucket, trainScriptKey, localTrainingScript)
    trainListArtifactKey = bp.getTrainImageListArtifactPath(trainId)

    responseInfo = {
        'trainingJobName': 'test1'
    }

    response = {
        'statusCode': 200,
        'body': responseInfo
    }

    return response
    
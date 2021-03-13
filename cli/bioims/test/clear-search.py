import sys
import json
import boto3
sys.path.insert(0, "../src")
import bioims
import numpy as np
import base64

searchClient = bioims.client('search')
trainingConfigurationClient = bioims.client('training-configuration')

trainList = trainingConfigurationClient.getEmbeddingTrainings('bbbc021-2')

for training in trainList:
    trainId = training['trainId']
    if trainId != 'origin':
        print(trainId)
        searchClient.deleteTraining(trainId)



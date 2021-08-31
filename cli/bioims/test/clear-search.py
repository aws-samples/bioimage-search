import sys
import json
import boto3
sys.path.insert(0, "../src")
import bioims
import numpy as np
import base64

searchClient = bioims.client('search')
trainingConfigurationClient = bioims.client('training-configuration')

trainList = trainingConfigurationClient.getEmbeddingTrainings('bbbc021')

# This will log the current loaded trainId list to the log of the search servcie, which might be useful:
searchClient.logTrainList()

for training in trainList:
    trainId = training['trainId']
    if trainId != 'origin':
        print(trainId)
        searchClient.deleteTraining(trainId)

# Examples for deleting specific trainIds:
# searchClient.deleteTraining('7g9h5c2cS8HjAs4kdcDdRK')
# searchClient.deleteTraining('7jFcXLieHNyRTRyQ5gaDRA')





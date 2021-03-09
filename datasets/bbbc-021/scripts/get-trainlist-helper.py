import sys
import time
import json
import boto3
sys.path.insert(0, "../../../cli/bioims/src")
import bioims

trainingConfigurationClient = bioims.client('training-configuration')

trainingList = trainingConfigurationClient.getEmbeddingTrainings('bbbc021-2')

filters = {}
trainIds = []

for training in trainingList:
    if 'filterKey' in training and len(training['filterKey'])>0:
        filters[training['trainId']] = training['filterKey']
        trainIds.append(training['trainId'])
    
trainIds.sort()

t=0
for trainId in trainIds:
    print("{} {} {}".format(t, trainId, filters[trainId]))
    t += 1

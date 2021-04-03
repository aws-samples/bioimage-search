import sys
import time
import json
import boto3
sys.path.insert(0, "../../../cli/bioims/src")
import bioims

trainingConfigurationClient = bioims.client('training-configuration')

if len(sys.argv) < 2:
    print("Usage: {} <embeddingName>".format(sys.argv[0]))
    exit(1)

embeddingName = sys.argv[1]

trainingList = trainingConfigurationClient.getEmbeddingTrainings(embeddingName)

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

import sys
import json
import boto3
sys.path.insert(0, "../src")
import bioims

# Inputs
trainId = "r6KEudzQCuUtDwCzziiMZT"
imageId = "17Sk8AHeX1idyJDBnMwEhX"

trainingConfigurationClient = bioims.client('training-configuration')
stacksDescription = trainingConfigurationClient.getStacksDescription()
params = {
    'stacksDescription': stacksDescription
}
imageManagementClient = bioims.client('image-management', params)
embeddingClient = bioims.client('embedding', params)

trainInfo = trainingConfigurationClient.getTraining(trainId)
embeddingName = trainInfo['embeddingName']
embeddingInfo = trainingConfigurationClient.getEmbeddingInfo(embeddingName)
imageOriginItem = imageManagementClient.getImageInfo(imageId, 'origin')
imageOrigin = imageOriginItem['Item']
plateId = imageOrigin['plateId']

print(trainInfo)
print(embeddingName)
print(embeddingInfo)
print(imageOrigin)
print(plateId)

r = embeddingClient.executeImageEmbeddingCompute(trainInfo, embeddingInfo, plateId, imageId)
print(r)

import sys
import json
import boto3
from boto3.dynamodb.conditions import Key, Attr
sys.path.insert(0, "../src")
import bioims
import numpy as np
import base64

# This script is used to delete, from the ImageManagement table, all entries not corresponding to valid
# trainIds in the TrainingConfiguration table, whose embeddings are listed below:
embeddingsToKeep = [ 'bbbc021' ]

# Step 1: Get all valid imageIds

IMAGE_MANAGEMENT_TABLE='BioimsImageManagement'
PLATE_INDEX='plateIdIndex'

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table(IMAGE_MANAGEMENT_TABLE)

allImageIds=[]
response = table.scan(IndexName=PLATE_INDEX)
items = response['Items']
while 'LastEvaluatedKey' in response:
    response = table.scan(IndexName=PLATE_INDEX, ExclusiveStartKey=response['LastEvaluatedKey'])
    items.extend(response['Items'])
    
itemsLength = len(items)
print("Found {} plate:image rows".format(itemsLength))

for imageItem in items:
    allImageIds.append(imageItem['imageId'])

# Step 2: Get all valid trainIds - note this includes 'origin'
    
trainingConfigurationClient = bioims.client('training-configuration')
trainingsToKeep = {}
for embedding in embeddingsToKeep:
    trainList = trainingConfigurationClient.getEmbeddingTrainings('bbbc021')
    for training in trainList:
        trainId = training['trainId']
        trainingsToKeep[trainId]=True
            
trainCount = len(trainingsToKeep)
print("Found {} trainIds".format(trainCount))

# Step 3: iterate through allImageIds[] and delete rows
# corresponding to trainIds not on the keep list.

totalRowsDeleted=0
for i, imageId in enumerate(allImageIds):
    imageResponse = table.query(KeyConditionExpression=Key('imageId').eq(imageId))
    imageItems = imageResponse['Items']
    while 'LastEvaluatedKey' in imageResponse:
        imageResponse = table.query(KeyConditionExpression=Key('imageId').eq(imageId), ExclusiveStartKey=imageResponse['LastEvaluatedKey'])
        imageItems.extend(imageResponse['Items'])
    rowCount = len(imageItems)
    deleteCount=0
    for trainItem in imageItems:
        trainId=trainItem['trainId']
        if trainId not in trainingsToKeep:
            deleteKey = { 
                'imageId' : imageId,
                'trainId' : trainId
                }
            table.delete_item(Key=deleteKey)
            deleteCount+=1
    totalRowsDeleted+=deleteCount
    print("For {} of {} imageId={} found {} rows and deleted {} totalRowsDeleted={}".format(i, itemsLength, imageId, rowCount, deleteCount, totalRowsDeleted))
            

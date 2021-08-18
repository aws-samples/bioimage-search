import sys
import json
import boto3
sys.path.insert(0, "../src")
import bioims

trainClient = bioims.client('train')

embeddingName='bbbc021'
filterBucket=''
filterKey=''
executeProcessPlate='false'
useSpot='false'

r = trainClient.train(embeddingName, filterBucket, filterKey, executeProcessPlate, useSpot)
print(r)



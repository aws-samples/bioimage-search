import sys
import json
import boto3
import io
sys.path.insert(0, "../src")
import bioims

INPUT_BUCKET = 'bioimage-search-input'
#INPUT_KEY = 'sourcePlateInfo_Week1_22141.json'
INPUT_KEY = 'sourcePlateInfo_Week1_22123.json'

processPlateClient = bioims.client('process-plate')

r = processPlateClient.uploadSourcePlate(INPUT_BUCKET, INPUT_KEY)

print(r)

import sys
import json
import boto3
import io
sys.path.insert(0, "../src")
import bioims

INPUT_BUCKET = 'bioimage-search-input'
INPUT_KEY_1 = 'sourcePlateInfo_Week1_22141.json'
INPUT_KEY_2 = 'sourcePlateInfo_Week1_22123.json'

processPlateClient = bioims.client('process-plate')

r1 = processPlateClient.uploadSourcePlate(INPUT_BUCKET, INPUT_KEY_1)

print(r1)

r2 = processPlateClient.uploadSourcePlate(INPUT_BUCKET, INPUT_KEY_2)

print(r2)


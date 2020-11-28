import sys
import json
import boto3
import io
sys.path.insert(0, "../src")
import bioims

processPlateClient = bioims.client('process-plate')

#r = processPlateClient.processPlate(TEST_PLATE_ID)

#print(r)

import sys
import json
import boto3
import io
sys.path.insert(0, "../src")
import bioims

TEST_PLATE_ID = "3YpbgZCfkNLfZHDTZU3E2x"

processPlateClient = bioims.client('process-plate')

r = processPlateClient.processPlate(TEST_PLATE_ID)

print(r)

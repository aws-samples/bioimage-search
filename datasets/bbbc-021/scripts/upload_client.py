import sys
import json
import boto3
import io
import argparse
sys.path.insert(0, "../../../cli/bioims/src")
import bioims

parser = argparse.ArgumentParser()

parser.add_argument('--inputBucket', type=str, help='bucket with json plate upload file')
parser.add_argument('--inputKey', type=str, help='key for json plate upload file')

args = parser.parse_args()

processPlateClient = bioims.client('process-plate')
r = processPlateClient.uploadSourcePlate(args.inputBucket, args.inputKey)
print(r)

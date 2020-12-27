import sys
import time
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

# Example response:
# {
#   'executionArn': 'arn:aws:states:us-east-1:580829821648:execution:UploadSourcePlateStateMachineB2584135-hhuatIbtubfI:UploadSourcePlate-uY4esUiyhxG7K52HHeE83Y-cCa7qdMSA2cXBF83DbeSrc', 
#   'startDate': '2020-12-27T16:06:23.204Z'
# }
#
# Example response to 'aws stepfunctions describe-exeuction --execution-arn <arn>':
# {
#   "executionArn": "arn:aws:states:us-east-1:580829821648:execution:UploadSourcePlateStateMachineB2584135-hhuatIbtubfI:UploadSourcePlate-uY4esUiyhxG7K52HHeE83Y-cCa7qdMSA2cXBF83DbeSrc",
#   "stateMachineArn": "arn:aws:states:us-east-1:580829821648:stateMachine:UploadSourcePlateStateMachineB2584135-hhuatIbtubfI",
#   "name": "UploadSourcePlate-uY4esUiyhxG7K52HHeE83Y-cCa7qdMSA2cXBF83DbeSrc",
#   "status": "SUCCEEDED",
#    "startDate": "2020-12-27T16:06:23.204000+00:00",
#   "stopDate": "2020-12-27T16:10:42.627000+00:00",
#   "input": "{ \"plateId\" : \"uY4esUiyhxG7K52HHeE83Y\" }",
#   "output": <>
# }

sfn = boto3.client('stepfunctions')
arn = r['executionArn']
sfnFinished = False
status = 'RUNNING'

while not sfnFinished:
    print("Waiting on {}".format(arn))
    time.sleep(10)
    response = sfn.describe_execution(executionArn=arn)
    status = response['status']
    print("status = {}".format(status))
    if status == 'RUNNING':
        sfnFinished = False
    else:
        sfnFinished = True
        
if status=='SUCCEEDED':
    sys.exit(0)
else:
    sys.exit("Error exiting with status {}".format(status))

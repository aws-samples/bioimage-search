# Usage: python get-train-input-helper.py | xargs -n 3 -P 1 python ./run-training-helper.py
# Note: using  xargs to separate these steps has the advantage of renewing aws credentials on each call to 
# avoid credential timeouts.

import sys
import time
import json
import boto3
sys.path.insert(0, "../../../cli/bioims/src")
import bioims

trainClient = bioims.client('train')

sfn = boto3.client('stepfunctions')

if len(sys.argv) < 4:
    exit(0)

embedding = sys.argv[1]
filterBucket = sys.argv[2]
filterKey = sys.argv[3]

print("{} {} {}".format(embedding, filterBucket, filterKey))

computeProcessPlate='false'

executionInfo = trainClient.train(embedding, filterBucket, filterKey, computeProcessPlate)
print(executionInfo)
executionArn = executionInfo['executionArn']
sfnFinished = False
status = 'RUNNING'
while not sfnFinished:
    print("Waiting on {}".format(executionArn))
    time.sleep(10)
    response = sfn.describe_execution(executionArn=executionArn)
    status = response['status']
    print("status = {}".format(status))
    if status == 'RUNNING':
        sfnFinished = False
    else:
        sfnFinished = True

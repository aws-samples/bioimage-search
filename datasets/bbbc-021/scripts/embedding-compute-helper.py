# Usage: python get-trainlist-helper.py | xargs -n 3 -P 1 python ./embedding-compute-helper.py
# Note: using  xargs to separate these steps has the advantage of renewing aws credentials on each call to 
# avoid credential timeouts.

import sys
import time
import json
import boto3
sys.path.insert(0, "../../../cli/bioims/src")
import bioims

embeddingClient = bioims.client('embedding')

sfn = boto3.client('stepfunctions')

if len(sys.argv) < 4:
    exit(0)

index = sys.argv[1]
trainId = sys.argv[2]
filterKey = sys.argv[3]

print("{} {} {}".format(index, trainId, filterKey))

executionInfo = embeddingClient.startComputeEmbedding(trainId)
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

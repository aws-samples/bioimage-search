# Usage: python get-train-input-helper.py [ ...args ] | xargs -n 3 -P 1 python ./run-training-helper.py
# -P can be increased but watch various limits.


import sys
import os
import time
import json
import boto3
sys.path.insert(0, "../../../cli/bioims/src")
import bioims

trainClient = bioims.client('train')

if len(sys.argv) < 4:
    exit(0)

embedding = sys.argv[1]
filterBucket = sys.argv[2]
filterKey = sys.argv[3]

print("{} {} {}".format(embedding, filterBucket, filterKey))

computeProcessPlate='false'
useSpot='false'

executionInfo = trainClient.train(embedding, filterBucket, filterKey, computeProcessPlate, useSpot)
print(executionInfo)
executionArn = executionInfo['executionArn']
executionArnComponents=executionArn.split(":")
executionId=executionArnComponents[-1]
os.system("mkdir -p /tmp/{}".format(executionId))
print(executionId)
statusTmpFile="/tmp/{}/status".format(executionId)
sfnFinished = False
status = 'RUNNING'
i = 0
while not sfnFinished:
    print("Waiting on {} {}".format(i, executionId))
    time.sleep(60)
    os.system("aws stepfunctions describe-execution --execution-arn {} > {}".format(executionArn, statusTmpFile))
    with open(statusTmpFile, "r") as status_file:
        status=status_file.read()
        if "RUNNING" not in status:
            sfnFinished = True
            print("Execution {} ended with status=\n{}".format(executionId, status))
    i+=1
os.system("rm -r /tmp/{}".format(executionId))

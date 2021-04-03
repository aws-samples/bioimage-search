# Usage: python get-trainlist-helper.py | xargs -n 3 -P 1 python ./embedding-upload-helper.py
# Note: using  xargs to separate these steps has the advantage of renewing aws credentials on each call to 
# avoid credential timeouts.

import os
import sys
import time
import json
import boto3
sys.path.insert(0, "../../../cli/bioims/src")
import bioims

searchClient = bioims.client('search')

if len(sys.argv) < 4:
    exit(0)

index = sys.argv[1]
trainId = sys.argv[2]
filterKey = sys.argv[3]

print("{} {} {}".format(index, trainId, filterKey))

executionInfo = searchClient.startTrainingLoad(trainId)
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
    time.sleep(20)
    os.system("aws stepfunctions describe-execution --execution-arn {} > {}".format(executionArn, statusTmpFile))
    with open(statusTmpFile, "r") as status_file:
        status=status_file.read()
        if "RUNNING" not in status:
            sfnFinished = True
            print("Execution {} ended with status=\n{}".format(executionId, status))
    i+=1
os.system("rm -r /tmp/{}".format(executionId))

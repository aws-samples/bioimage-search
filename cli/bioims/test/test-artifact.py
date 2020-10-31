import sys
import json
from random import seed
from random import randint
import boto3
sys.path.insert(0, "../src")
import bioims

artifactClient = bioims.client('artifact')

print(artifactClient.getLambdaArn())

seed(1)

mids=[]

for i in range(10):
    artifact = {
        "typeId" : "plate",
        "trainId" : "train-id-1",
        "s3key" : "s3key-1",
        "s3bucket" : "s3bucket-1",
        "type" : "type-1"
    }
    r = artifactClient.createArtifact(artifact)
    print(r)

# for i in range(10):
#     r = messageClient.getMessage(mids[i])
#     print(r)

# for i in range(10):
#     print(i)
#     print(mids[i])
#     r = messageClient.addMessage(mids[i], "message test add3 "+str(i))
#     print(r)

# for i in range(10):
#     print(i)
#     print(mids[i])
#     r = messageClient.addMessage(mids[i], "message test add4 "+str(i))
#     print(r)
    
# for i in range(10):
#     r = messageClient.listMessage(mids[i])
#     print(r)

# for i in range(10):
#     messageClient.deleteMessage(mids[i])

import sys
import json
from random import seed
from random import randint
import boto3
sys.path.insert(0, "../src")
import bioims

artifactClient = bioims.client('artifact')

# print(artifactClient.getLambdaArn())

# seed(1)

# mids=[]

# for i in range(10):
#     artifact = {
#         "contextId" : 'plate-'+str(i),
#         "trainId" : 'train-id-'+str(i),
#         "artifact" : 's3key#'+str(i),
#         "s3bucket" : 's3bucket-'+str(i),
#         "description" : 'type-'+str(i)
#     }
#     r = artifactClient.createArtifact(artifact)
#     print(r)

# for i in range(10):
#     r = artifactClient.getArtifacts('plate-'+str(i), 'train-id-'+str(i))
#     print(r)

# for i in range(10):
#     artifact = {
#         "contextId" : 'plate-'+str(i),
#         "trainId" : 'train-id-'+str(i),
#         "artifact" : 's3key#'+str(i)+'-2',
#         "s3bucket" : 's3bucket-'+str(i),
#         "description" : 'type-'+str(i)
#     }
#     r = artifactClient.createArtifact(artifact)
#     print(r)

# for i in range(10):
#     r = artifactClient.getArtifacts('plate-'+str(i), 'train-id-'+str(i))
#     print(r)

# for i in range(10):
#     r = artifactClient.deleteArtifacts('plate-'+str(i), 'train-id-'+str(i))
#     print(r)

#r = artifactClient.createDescribeStacksArtifact("context-id-123456", "train-id-123456")
#print(r)

r = artifactClient.getArtifacts('1xDNMw2ZFhpSGDTppgyeMU', 'origin')
print(r)

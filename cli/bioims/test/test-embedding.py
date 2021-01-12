import sys
import json
import boto3
sys.path.insert(0, "../src")
import bioims

embeddingClient = bioims.client('embedding')

trainId = "r6KEudzQCuUtDwCzziiMZT"
r = embeddingClient.startEmbeddingCompute(trainId)
print(r)

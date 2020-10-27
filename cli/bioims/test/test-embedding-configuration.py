import sys
import json
import boto3
sys.path.insert(0, "../src")
import bioims

embeddingConfigurationClient = bioims.client('embedding-configuration')

embedding = {
    "name1": "embeddingName1",
    "imageMethodArn": "testImageMethodArn1",
    "imagePostMethodArn": "testImagePostMethodArn1",
    "inputHeight": 1000,
    "inputWidth": 1000,
    "inputDepth": 1,
    "inputChannels": 3,
    "roiHeight": 128,
    "roiWidth": 128,
    "roiDepth": 1,
    "embeddingVectorLength": 1024
}

r = embeddingConfigurationClient.createEmbedding(embedding)

print(r)

r = embeddingConfigurationClient.getEmbedding(embedding["name1"])

print(r)

r = embeddingConfigurationClient.deleteEmbedding(embedding["name1"])

print(r)


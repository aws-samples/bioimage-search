import sys
import json
import boto3
sys.path.insert(0, "../src")
import bioims

embeddingConfigurationClient = bioims.client('embedding-configuration')

embedding = {
    "name1": "embeddingName1",
    "image-method-arn": "testImageMethodArn1",
    "image-post-method-arn": "testImagePostMethodArn1",
    "input-height": 1000,
    "input-width": 1000,
    "input-depth": 1,
    "input-channels": 3,
    "roi-height": 128,
    "roi-width": 128,
    "roi-depth": 1,
    "embedding-vector-length": 1024
}

r = embeddingConfigurationClient.createEmbedding(embedding)

print(r)

r = embeddingConfigurationClient.getEmbedding(embedding["name1"])

print(r)

r = embeddingConfigurationClient.deleteEmbedding(embedding["name1"])

print(r)


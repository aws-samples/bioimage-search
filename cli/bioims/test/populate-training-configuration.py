import sys
import json
import boto3
sys.path.insert(0, "../src")
import bioims

trainingConfigurationClient = bioims.client('training-configuration')

embedding = {
    "embeddingName" : "bbbc021",
    "plateMethodArn" : "plateMethodArn-placeholder",
    "wellMethodArn" : "wellMethodArn-placeholder",
    "imageMethodArn" : "imageMethodArn-placeholder",
    "imagePostMethodArn" : "imagePostMethodArn-placeholder",
    "modelTrainingScriptBucket" : "bioimage-search-input",
    "modelTrainingScriptKey" : "bbbc021-train-script.py",
    "trainingHyperparameters" : {
        'epochs': 15,
        'backend': 'gloo',
        'seed': 1,
        'batch_size': 1
    },
    "inputHeight" : 1024,
    "inputWidth" : 1280,
    "inputDepth" : 1,
    "inputChannels" : 3,
    "roiHeight" : 128,
    "roiWidth" : 128,
    "roiDepth" : 1,
    "embeddingVectorLength" : 256,
    "comments" : ""
}

r = trainingConfigurationClient.createEmbedding(embedding)

print(r)

import sys
import json
import boto3
sys.path.insert(0, "../src")
import bioims

trainingConfigurationClient = bioims.client('training-configuration')

embedding = {
    "embeddingName" : "bbbc021",
    "plateMethodArn" : "arn:aws:batch:us-east-1:580829821648:job-definition/platepreprocessingjobde-586209612f00161:18",
    "wellMethodArn" : "wellMethodArn-placeholder",
    "imageMethodArn" : "arn:aws:batch:us-east-1:580829821648:job-definition/imagepreprocessingjobde-af308e24979dc7d:15",
    "imagePostMethodArn" : "imagePostMethodArn-placeholder",
    "modelTrainingScriptBucket" : "bioimage-search-input",
    "modelTrainingScriptKey" : "bbbc021-train-script.py",
    "trainingInstanceType" : "ml.p2.xlarge",
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

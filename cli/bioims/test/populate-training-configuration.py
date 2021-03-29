import sys
import json
import boto3
sys.path.insert(0, "../src")
import bioims

trainingConfigurationClient = bioims.client('training-configuration')

# To be filled-in for each new deployment
plateMethodArn="arn:aws:batch:us-east-1:147147579088:job-definition/platepreprocessingjobde-1af70a04077a5e6:1"
imageMethodArn="arn:aws:batch:us-east-1:147147579088:job-definition/imagepreprocessingjobde-91a668a4c3c759e:1"

embedding1 = {
    "embeddingName" : "bbbc021-1",
    "plateMethodArn" : plateMethodArn,
    "wellMethodArn" : "wellMethodArn-placeholder",
    "imageMethodArn" : imageMethodArn,
    "imagePostMethodArn" : "imagePostMethodArn-placeholder",
    "modelTrainingScriptBucket" : "bioims-resource-1",
    "modelTrainingScriptKey" : "bbbc021-1-train-script.py",
    "trainingInstanceType" : "p3.2xlarge",
    "trainingHyperparameters" : {
        'epochs': 2,
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

r = trainingConfigurationClient.createEmbedding(embedding1)
print(r)


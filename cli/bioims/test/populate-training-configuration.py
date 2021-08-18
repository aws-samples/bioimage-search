import sys
import json
import boto3
sys.path.insert(0, "../src")
import bioims

trainingConfigurationClient = bioims.client('training-configuration')

# To be filled-in for each new deployment
plateMethodArn="arn:aws:batch:us-east-1:580829821648:job-definition/platepreprocessingjobde-ff261d778b568c4:1"
imageMethodArn="arn:aws:batch:us-east-1:580829821648:job-definition/imagepreprocessingjobde-db2957c2c6f42c5:4"
embedding1 = {
    "embeddingName" : "bbbc021",
    "plateMethodArn" : plateMethodArn,
    "wellMethodArn" : "wellMethodArn-placeholder",
    "imageMethodArn" : imageMethodArn,
    "imagePostMethodArn" : "imagePostMethodArn-placeholder",
    "modelTrainingScriptBucket" : "bioimage-search-input",
    "modelTrainingScriptKey" : "bbbc021-1-train-script.py",
    "trainingInstanceType" : "ml.g4dn.4xlarge",
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


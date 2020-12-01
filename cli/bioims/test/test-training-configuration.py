import sys
import json
import boto3
sys.path.insert(0, "../src")
import bioims

trainingConfigurationClient = bioims.client('training-configuration')

# Embedding
# const PLATE_PROCESSING_ARN_ATTRIBUTE = "plateMethodArn";
# const WELL_PROCESSING_ARN_ATTRIBUTE = "wellMethodArn";
# const IMAGE_PROCESSING_ARN_ATTRIBUTE = "imageMethodArn";
# const IMAGE_POST_PROCESSING_ARN_ATTRIBUTE = "imagePostMethodArn";
# const MODEL_TRAINING_SCRIPT_BUCKET_ATTRIBUTE = "modelTrainingScriptBucket";
# const MODEL_TRAINING_SCRIPT_KEY_ATTRIBUTE = "modelTrainingScriptKey";
# const TRAINING_HYPERPARAMETERS_ATTRIBUTE = "trainingHyperparameters";
# const INPUT_HEIGHT_ATTRIBUTE = "inputHeight";
# const INPUT_WIDTH_ATTRIBUTE = "inputWidth";
# const INPUT_DEPTH_ATTRIBUTE = "inputDepth";
# const INPUT_CHANNELS_ATTRIBUTE = "inputChannels";
# const ROI_HEIGHT_ATTRIBUTE = "roiHeight";
# const ROI_WIDTH_ATTRIBUTE = "roiWidth";
# const ROI_DEPTH_ATTRIBUTE = "roiDepth";
# const EMBEDDING_VECTOR_LENGTH_ATTRIBUTE = "embeddingVectorLength";
# const COMMENTS_ATTRIBUTE = "comments";

# Training
# const FILTER_BUCKET_ATTRIBUTE = "filterBucket";
# const FILTER_INCLUDE_KEY_ATTRIBUTE = "filterIncludeKey";
# const FILTER_EXCLUDE_KEY_ATTRIBUTE = "filterExcludeKey";
# const SAGEMAKER_TRAIN_ID_ATTRIBUTE = "sagemakerTrainId";
# const TRAINING_JOB_MESSAGE_ID_ATTRIBUTE = "trainMessageId";
# const MODEL_BUCKET_ATTRIBUTE = "modelBucket";
# const MODEL_KEY_ATTRIBUTE = "modelKey"

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

#r = trainingConfigurationClient.createEmbedding(embedding)

#print(r)

r = trainingConfigurationClient.getTraining('2uqemYqVnt38iEKxqaacb8')

print(r)


# r = trainingConfigurationClient.createTraining(training)

# print(r)

# r = trainingConfigurationClient.updateTraining(training["train_id"], "filterBucket", "filter-bucket-2")

# print(r)

# r = trainingConfigurationClient.getTraining(training["train_id"])

# print(r)

# r = trainingConfigurationClient.deleteTraining(training["train_id"])

# print(r)

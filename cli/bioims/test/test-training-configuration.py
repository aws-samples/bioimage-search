import sys
import json
import boto3
sys.path.insert(0, "../src")
import bioims

trainingConfigurationClient = bioims.client('training-configuration')

# const FILTER_BUCKET_ATTRIBUTE = "filter-bucket";
# const FILTER_INCLUDE_KEY_ATTRIBUTE = "filter-include-key";
# const FILTER_EXCLUDE_KEY_ATTRIBUTE = "filter-exclude-key";
# const EMBEDDING_NAME_ATTRIBUTE = "embedding-name";
# const SAGEMAKER_TRAIN_ID_ATTRIBUTE = "sagemaker-train-id";
# const TRAINING_JOB_MESSAGE_ID_ATTRIBUTE = "train-message-id";
# const MODEL_BUCKET_ATTRIBUTE = "model-bucket";
# const MODEL_KEY_ATTRIBUTE = "model-key"

training = {
    "train_id": "123456789",
    "filterBucket": "filter-bucket-1",
    "filterIncludeKey": "filter-include-key1",
    "filterExcludeKey": "filter-exclude-key1",
    "embeddingName": "embedding-name1",
    "sagemakerTrainId": "sagemaker-train-id1",
    "trainMessageId": "train-message-id1",
    "modelBucket" : "model-bucket1",
    "modelKey" : "model-key1"
}

#r = trainingConfigurationClient.createTraining(training)

#print(r)

r = trainingConfigurationClient.updateTraining(training["train_id"], "filterBucket", "filter-bucket-2")

print(r)

import sys
import json
import boto3
import io
sys.path.insert(0, "../src")
import bioims

TEST_INPUT_BUCKET = "bioimage-search-input"
TEST_OUTPUT_BUCKET = "bioimage-search-output"

trainingConfigurationClient = bioims.client('training-configuration')
imageManagementClient = bioims.client('image-management')

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

plateSourceInfo = {
    "train_id": training["train_id"],
    "key1" : "value1",
    "key2" : "value2"
}

s3 = boto3.client('s3')

stringBuffer = io.StringIO()

stringBuffer.write(json.dumps(plateSourceInfo))

ioBuffer = io.BytesIO(stringBuffer.getvalue().encode())

plateSourceKey = "plateSourceKey.json"

s3.upload_fileobj(ioBuffer, TEST_INPUT_BUCKET, plateSourceKey)

r = trainingConfigurationClient.createTraining(training)

print(r)

plateManifestKey = "plateManifestKey.json"

r = imageManagementClient.createManifest(TEST_INPUT_BUCKET, plateSourceKey, TEST_OUTPUT_BUCKET, plateManifestKey)

print(r)

# r = trainingConfigurationClient.deleteTraining(training["train_id"])

# print(r)

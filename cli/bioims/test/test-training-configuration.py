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

# r = trainingConfigurationClient.getTraining('2uqemYqVnt38iEKxqaacb8')

# print(r)


# r = trainingConfigurationClient.createTraining(training)

# print(r)

# r = trainingConfigurationClient.updateTraining(training["train_id"], "filterBucket", "filter-bucket-2")

# print(r)

# r = trainingConfigurationClient.getTraining(training["train_id"])

# print(r)

# r = trainingConfigurationClient.deleteTraining(training["train_id"])

# print(r)

#trainId = "r6KEudzQCuUtDwCzziiMZT"
#trainingJobName = "bioims-r6KEudzQCuUtDwCzziiMZT-gk34gTVUw8RiCd6MXaTWqC"

#r = trainingConfigurationClient.updateTraining(trainId, 'sagemakerJobName', 'testJobName1')

# r = trainingConfigurationClient.getTrainingJobInfo(trainingJobName)
# print(r)

#r = trainingConfigurationClient.getEmbeddingInfo('bbbc021')
#print(r)

r = trainingConfigurationClient.getTrainingJobInfo('bioims-vT44kUtLi7jnSGC7VXG7iT-j2xvJ5W8TbmNxZrK4mNYUd')
print(r)

# {
#     'TrainingJobName': 'bioims-vT44kUtLi7jnSGC7VXG7iT-j2xvJ5W8TbmNxZrK4mNYUd', 
#     'TrainingJobArn': 'arn:aws:sagemaker:us-east-1:580829821648:training-job/bioims-vt44kutli7jnsgc7vxg7it-j2xvj5w8tbmnxzrk4mnyud', 
#     'ModelArtifacts': {
#         'S3ModelArtifacts': 's3://sagemaker-us-east-1-580829821648/bioims-vT44kUtLi7jnSGC7VXG7iT-j2xvJ5W8TbmNxZrK4mNYUd/output/model.tar.gz'
#     }, 
#     'TrainingJobStatus': 'Completed', 
#     'SecondaryStatus': 'Completed', 
#     'HyperParameters': {
#         'backend': '"gloo"', 
#         'batch_size': '1', 
#         'epochs': '15', 
#         'sagemaker_container_log_level': '20', 
#         'sagemaker_job_name': '"bioims-vT44kUtLi7jnSGC7VXG7iT-j2xvJ5W8TbmNxZrK4mNYUd"', 
#         'sagemaker_program': '"bioims-training-script.py"', 
#         'sagemaker_region': '"us-east-1"', 
#         'sagemaker_submit_directory': '"s3://sagemaker-us-east-1-580829821648/bioims-vT44kUtLi7jnSGC7VXG7iT-j2xvJ5W8TbmNxZrK4mNYUd/source/sourcedir.tar.gz"', 
#         'seed': '1',
#         'train_list_file': '"artifact/train/vT44kUtLi7jnSGC7VXG7iT/vT44kUtLi7jnSGC7VXG7iT-image-prefix-list.txt"'
#     }, 
#     'AlgorithmSpecification': {
#         'TrainingImage': '763104351884.dkr.ecr.us-east-1.amazonaws.com/pytorch-training:1.6.0-gpu-py36-cu101-ubuntu16.04', 
#         'TrainingInputMode': 'File', 
#         'EnableSageMakerMetricsTimeSeries': True
#     }, 
#     'RoleArn': 'arn:aws:iam::580829821648:role/BioimageSearchTrainStack-trainComputeFunctionServi-1J0FGZ38EYL9Q', 
#     'InputDataConfig': [
#         {
#             'ChannelName': 'training', 
#             'DataSource': {
#                 'FileSystemDataSource': {
#                     'FileSystemId': 'fs-0851014c71bcede17', 
#                     'FileSystemAccessMode': 'ro', 
#                     'FileSystemType': 'FSxLustre', 
#                     'DirectoryPath': '/2nolnbmv'
#                 }
#             }, 
#             'CompressionType': 'None', 
#             'RecordWrapperType': 'None'
#         }], 
#     'OutputDataConfig': {
#         'KmsKeyId': '', 'S3OutputPath': 's3://sagemaker-us-east-1-580829821648/'
#     }, 
#     'ResourceConfig': {
#         'InstanceType': 'ml.m5.4xlarge', 
#         'InstanceCount': 1, 
#         'VolumeSizeInGB': 30
#     }, 
#     'VpcConfig': {
#         'SecurityGroupIds': ['sg-04fe7473aca28bdd6'], 
#         'Subnets': ['subnet-0e15488f4300569aa']
#     }, 
#     'StoppingCondition': {
#         'MaxRuntimeInSeconds': 100000, 
#         'MaxWaitTimeInSeconds': 100000
#     }, 
#     'CreationTime': '2021-02-24T21:58:53.645Z', 
#     'TrainingStartTime': '2021-02-24T22:00:55.276Z', 
#     'TrainingEndTime': '2021-02-25T08:18:01.414Z', 
#     'LastModifiedTime': '2021-02-25T08:18:31.641Z', 
#     'SecondaryStatusTransitions': [
#         {'Status': 'Starting', 
#         'StartTime': '2021-02-24T21:58:53.645Z', 
#         'EndTime': '2021-02-24T22:00:55.276Z', 
#         'StatusMessage': 'Preparing the instances for training'},
#         {'Status': 'Downloading', 'StartTime': '2021-02-24T22:00:55.276Z', 'EndTime': '2021-02-24T22:01:12.600Z', 'StatusMessage': 'Downloading input data'}, 
#         {'Status': 'Training', 'StartTime': '2021-02-24T22:01:12.600Z', 'EndTime': '2021-02-25T08:17:53.138Z', 'StatusMessage': 'Training image download completed. Training in progress.'}, 
#         {'Status': 'Uploading', 'StartTime': '2021-02-25T08:17:53.138Z', 'EndTime': '2021-02-25T08:18:01.414Z', 'StatusMessage': 'Uploading generated training model'}, 
#         {'Status': 'Completed', 'StartTime': '2021-02-25T08:18:01.414Z', 'EndTime': '2021-02-25T08:18:01.414Z', 'StatusMessage': 'Training job completed'}], 
#     'EnableNetworkIsolation': False, 
#     'EnableInterContainerTrafficEncryption': False, 
#     'EnableManagedSpotTraining': True,
#     'TrainingTimeInSeconds': 37026, 
#     'BillableTimeInSeconds': 14683, 
#     'DebugHookConfig': {
#         'S3OutputPath': 's3://sagemaker-us-east-1-580829821648/', 
#         'CollectionConfigurations': []}}

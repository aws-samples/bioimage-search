import boto3
import os
import json
import bioimagepath as bp
import sagemaker
from sagemaker.pytorch import PyTorch
from sagemaker.inputs import FileSystemInput

MESSAGE_LAMBDA_ARN = os.environ['MESSAGE_LAMBDA_ARN']
IMAGE_MANAGEMENT_LAMBDA_ARN = os.environ['IMAGE_MANAGEMENT_LAMBDA_ARN']
TRAIN_CONFIGURATION_LAMBDA_ARN = os.environ['TRAIN_CONFIGURATION_LAMBDA_ARN']
ARTIFACT_LAMBDA_ARN = os.environ['ARTIFACT_LAMBDA_ARN']
BUCKET = os.environ['BUCKET']

"""
Steps:

1. Get trainInfo and embeddingInfo
2. Determine the artifact path to the list of training prefix files
3. Determine the fsxl equivalent path
4. Create the estimator based on the assumption the training script is in the same dir
5. Pass the prefix list file path as a hyper-parameter to the training job
6. Start the SageMaker training job

"""

def handler(event, context):
    trainId = event['trainId']
    trainListArtifactKey = bp.getTrainImageListArtifactPath(trainId)
    sagemaker_session = sagemaker.Session()
    sagemaker_bucket = sagemaker_session.default_bucket()
    sagemaker_role = sagemaker.get_execution_role()
    training_script = 'bioims-training-script.py'
    py_version = '1.6.0'
    instance_type = 'ml.p2.xlarge'

    file_system_input = FileSystemInput(file_system_id='fs-03ad19da07147c9c8',
                                    file_system_type='FSxLustre',
                                    directory_path='/s633rbmv',
                                    file_system_access_mode='ro')

    estimator = PyTorch(entry_point=training_script,
                    role=sagemaker_role,
                    framework_version=py_version,
                    instance_count=1,
                    instance_type=instance_type,
                    py_version='py36',
                    image_name='763104351884.dkr.ecr.us-east-1.amazonaws.com/pytorch-training:1.6.0-gpu-py36-cu101-ubuntu16.04',
                    subnets=['subnet-008ed533d574fc9df'],
                    security_group_ids=['sg-0749634e5385db557'],
                    hyperparameters={
                        'train_list_file': trainListArtifactKey,
                        'epochs': 15,
                        'backend': 'gloo',
                        'seed': 1,
                        'batch_size': 1
                    },
                    #train_use_spot_instances=True,
                    #train_max_wait=20000,
                    #train_max_run=20000
                )

    estimatorResponse = estimator.fit(file_system_input, wait=False)
    
    response = {
        'statusCode': 200,
        'body': estimatorResponse
    }
    
    return response
    
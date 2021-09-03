import boto3
import os
import json
import shortuuid as su
import bioimagepath as bp
import bioims
import sagemaker
from sagemaker.pytorch import PyTorch
from sagemaker.inputs import FileSystemInput

VERSION=3

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

def getFsxInfo():
    fsx = boto3.client("fsx")
    ec2 = boto3.client("ec2")
    fileSystems=fsx.describe_file_systems()
    fsList = fileSystems['FileSystems']
    fileSystem=None
    for fs in fsList:
        tags = fs['Tags']
        for tag in tags:
            key=tag['Key']
            value=tag['Value']
            if value.startswith('BioimageSearch'):
                fileSystem=fs
                break
    if fileSystem==None:
        fsxInfo = {
            'subnetIds': '',
            'fsxId': '',
            'securityGroupIds': '',
            'directoryPath': ''
        }
        return fsxInfo
    else:
        fsxId = fileSystem['FileSystemId']
        subnetIds = fileSystem['SubnetIds']
        vpcId = fileSystem['VpcId']
        lustreConfiguration = fileSystem['LustreConfiguration']
        mountName = lustreConfiguration['MountName']
        securityGroupInfo = ec2.describe_security_groups()
        securityGroupId=None
        securityGroups = securityGroupInfo['SecurityGroups']
        for sg in securityGroups:
            description = sg['Description']
            if description.startswith('BioimageSearchLustreStack'):
                securityGroupId = sg['GroupId']
                break
        fsxInfo = {
            'fsxId' : fsxId,
            'subnetIds' : subnetIds,
            'vpcId' : vpcId,
            'mountName' : mountName,
            'securityGroup' : securityGroupId
        }
        return fsxInfo
        
def getS3TextObjectWriteToPath(bucket, key, path):
    s3c = boto3.client("s3")
    fileObject = s3c.get_object(Bucket=bucket, Key=key)
    text = fileObject['Body'].read().decode('utf-8')
    path_file = open(path, "w")
    path_file.write(text)
    path_file.close()

def handler(event, context):
    trainId = event['trainId']
    useSpotArg = event['useSpot']
    useSpot=True
    if useSpotArg.lower()=='false':
        useSpot=False
    uniqueId = su.uuid()
    trainingConfigurationClient = bioims.client('training-configuration')
    trainInfo = trainingConfigurationClient.getTraining(trainId)
    embeddingName = trainInfo['embeddingName']
    embeddingInfo = trainingConfigurationClient.getEmbeddingInfo(embeddingName)
    trainScriptBucket = embeddingInfo['modelTrainingScriptBucket']
    trainScriptKey =embeddingInfo['modelTrainingScriptKey']
    localTrainingScript = '/tmp/bioims-training-script.py'
    getS3TextObjectWriteToPath(trainScriptBucket, trainScriptKey, localTrainingScript)
    trainListArtifactKey = bp.getTrainImageListArtifactPath(trainId)
    sagemaker_session = sagemaker.Session()
    sagemaker_bucket = sagemaker_session.default_bucket()
    sagemaker_role = sagemaker.get_execution_role()
    py_version = '1.6.0'
    instance_type = embeddingInfo['trainingInstanceType']
    trainingHyperparameters = embeddingInfo['trainingHyperparameters']
    fsxInfo = getFsxInfo()
    print(fsxInfo)
    directory_path = '/' + fsxInfo['mountName']
    sgIds=[]
    sgIds.append(fsxInfo['securityGroup'])
    jobName = 'bioims-' + trainId + '-' + uniqueId
    checkpoint_s3_uri = "s3://" + sagemaker_bucket + "/checkpoints/" + jobName

    file_system_input = FileSystemInput(file_system_id=fsxInfo['fsxId'],
                                    file_system_type='FSxLustre',
                                    directory_path=directory_path,
                                    file_system_access_mode='ro')
    
    trainingHyperparameters['train_list_file'] = trainListArtifactKey

    if useSpot:
        estimator = PyTorch(entry_point=localTrainingScript,
                    role=sagemaker_role,
                    framework_version=py_version,
                    instance_count=1,
                    instance_type=instance_type,
                    py_version='py36',
                    image_name='763104351884.dkr.ecr.us-east-1.amazonaws.com/pytorch-training:1.6.0-gpu-py36-cu101-ubuntu16.04',
                    subnets=fsxInfo['subnetIds'],
                    security_group_ids=sgIds,
                    hyperparameters = trainingHyperparameters,
                    train_use_spot_instances=True,
                    train_max_wait=100000,
                    train_max_run=100000,
                    checkpoint_s3_uri = checkpoint_s3_uri,
                    debugger_hook_config=False
                )
    else:
              estimator = PyTorch(entry_point=localTrainingScript,
                    role=sagemaker_role,
                    framework_version=py_version,
                    instance_count=1,
                    instance_type=instance_type,
                    py_version='py36',
                    image_name='763104351884.dkr.ecr.us-east-1.amazonaws.com/pytorch-training:1.6.0-gpu-py36-cu101-ubuntu16.04',
                    subnets=fsxInfo['subnetIds'],
                    security_group_ids=sgIds,
                    hyperparameters = trainingHyperparameters,
                    train_use_spot_instances=False,
                    checkpoint_s3_uri = checkpoint_s3_uri,
                    debugger_hook_config=False
                )
                    
    trainingConfigurationClient.updateTraining(trainId, 'sagemakerJobName', jobName)

    estimator.fit(file_system_input, wait=False, job_name=jobName)
    
    responseInfo = {
        'trainingJobName': jobName
    }

    response = {
        'statusCode': 200,
        'body': responseInfo
    }

    return response
    
import boto3
import os
import json
import bioimagepath as bp
from io import StringIO, BytesIO
import bioims

MESSAGE_LAMBDA_ARN = os.environ['MESSAGE_LAMBDA_ARN']
IMAGE_MANAGEMENT_LAMBDA_ARN = os.environ['IMAGE_MANAGEMENT_LAMBDA_ARN']
TRAIN_CONFIGURATION_LAMBDA_ARN = os.environ['TRAIN_CONFIGURATION_LAMBDA_ARN']
ARTIFACT_LAMBDA_ARN = os.environ['ARTIFACT_LAMBDA_ARN']
BUCKET = os.environ['BUCKET']

"""
Steps:

1. Read in the info for the trainId and its embedding
2. Read in the filter list for the trainId, if there is a list
3. Create a list to accumulate train file prefix paths
4. Get the list of compatible plateIds for the Embedding associated the trainId
5. For each plateId, get its corresponding list of imageIds
6. Filter out imageIds in the exclusion list
7. For included imageIds, generate and add paths to the train file prefix list
8. Once the entire list is generated, write to artifact path and add entries in both the train and artifact tables

"""

s3c = boto3.client('s3')

imageClient = bioims.client('image-management')
stacksDescription = imageClient.getStacksDescription()
params = {
    "stacksDescription": stacksDescription
}
trainConfigurationClient = bioims.client('train-configuration', params)
artifactClient = bioims.client('artifact', params)


def getCompatiblePlates(embeddingInfo):
    width = embeddingInfo['inputWidth']
    height = embeddingInfo['inputHeight']
    depth = embeddingInfo['inputDepth']
    channels = embeddingInfo['inputChannels']
    request = '{{ "method": "listCompatiblePlates", "width": {}, "height": {}, "depth": {}, "channels": {}}}'.format(width, height, depth, channels)
    payload = bytes(request, encoding='utf-8')
    lambdaClient = boto3.client('lambda')
    response = lambdaClient.invoke(
        FunctionName=IMAGE_MANAGEMENT_LAMBDA_ARN,
        InvocationType='RequestResponse',
        Payload=payload
        )
    return response


def handler(event, context):
    trainId = event['trainId']
    trainInfo = trainConfigurationClient.getTraining(trainId)
    embeddingName = trainInfo['embeddingName']
    embeddingInfo = trainConfigurationClient.getEmbeddingInfo(embeddingName)
    filterDict={}
    if ('filterBucket' in trainInfo) and ('filterKey' in trainInfo):
        filterBucket = trainInfo['filterBucket']
        filterKey = trainInfo['filterKey']
        fileObject = s3c.get_object(Bucket=filterBucket, Key=filterKey)
        text = fileObject['Body'].read().decode('utf-8')
        lines = text.splitlines()
        for line in lines:
            filterDict[line]=True
    filterCount = len(filterDict.items)
    print("Filter contains {} entries".format(filterCount))
    plateList = imageClient.listCompatiblePlates(embeddingInfo['inputWidth'], embeddingInfo['inputHeight'], embeddingInfo['inputDepth'], embeddingInfo['inputChannels'])
    skipCount=0
    trainPrefixList=[]
    for i, pi in enumerate(plateList):
        print("Processing plate {} {} of {}".format(pi, i, len(plateList)))
        imageList = imageClient.getImagesByPlateId(pi)
        for imageItem in imageList:
            image = imageItem['Item']
            imageId = image['imageId']
            if imageId in filterDict:
                skipCount+=1
            else:
                prefixKey = bp.getTrainPrefixKey(embeddingName, pi, imageId)
                trainPrefixList.append(prefixKey)
    print("Train prefix list has {} entries".format(len(trainPrefixList)))
    trainPrefixArtifactPath = bp.getTrainImageListArtifactPath(trainId)
    trainPrefixStringList = "\n".join(trainPrefixList) + "\n"
    trainPrefixStringListBytes = bytes(trainPrefixStringList, encoding='utf-8')
    s3c.upload_fileobj(trainPrefixStringListBytes, BUCKET, trainPrefixArtifactPath)
    akey = "s3key#" + trainPrefixArtifactPath
    artifact = {
        "contextId": trainId,
        "trainId": trainId,
        "artifact": akey
    }
    artifactClient.createArtifact(artifact)
    return trainPrefixArtifactPath
    
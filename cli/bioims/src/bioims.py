import boto3
import json
import base64
import shortuuid

class BioimageSearchResources:
    def __init__(self):
        self._stacksDescription = ""

        # self._configurationLambdaArn = ""
        # self._labelLambdaArn = ""
        # self._messageLambdaArn = ""
        # self._defaultArtifactLambdaArn = ""
        # self._onDemandQueueName = ""
        # self._spotQueueName = ""
        # self._platePreprocessingJobDefnName = ""
        # self._imagePreprocessingJobDefnName = ""

    def refresh(self):
        cf = boto3.client('cloudformation')
        self._stacksDescription = cf.describe_stacks()
        
##### STACKS        

    def getStackByName(self, stackName):
        stacks = self._stacksDescription['Stacks']
        for stack in stacks:
            if stack['StackName'] == stackName:
                return stack
        return ""
        
    def getBaseStack(self):
        return self.getStackByName('BioimageSearchBaseStack')
        
    def getConfigurationStack(self):
        return self.getStackByName('BioimageSearchConfigurationStack')

    def getLabelStack(self):
        return self.getStackByName('BioimageSearchLabelStack')

    def getMessageStack(self):
        return self.getStackByName('BioimageSearchMessageStack')

    def getImageArtifactStack(self):
        return self.getStackByName('BioimageSearchImageArtifactStack')
        
    def getBatchSetupStack(self):
        return self.getStackByName('BioimageSearchBatchSetupStack')

    def getPlatePreprocessingStack(self):
        return self.getStackByName('BioimageSearchPlatePreprocessingStack')
        
    def getEmbeddingConfigurationStack(self):
        return self.getStackByName('BioimageSearchEmbeddingConfigurationStack')
        
    def getTrainingConfigurationStack(self):
        return self.getStackByName('BioimageSearchTrainingConfigurationStack')
        
    def getArtifactStack(self):
        return self.getStackByName('BioimageSearchArtifactStack')
        
    def getImageManagementStack(self):
        return self.getStackByName('BioimageSearchImageManagementStack')
        
##### FUNCTIONS

    def getStackOutputByPrefix(self, stack, prefix):
        outputs = stack['Outputs']
        for output in outputs:
            output_key = output['OutputKey']
            if output_key.startswith(prefix):
                return output['OutputValue']
        return ""

##### BUCKETS        

    def getTestBucketName(self):
        return self.getStackOutputByPrefix(self.getBaseStack(), 'testBucket')
        
##### LAMBDA

    def getConfigurationLambdaArn(self):
        return self.getStackOutputByPrefix(self.getConfigurationStack(), 'ExportsOutputFnGetAttconfigurationFunction')

    def getLabelLambdaArn(self):
        return self.getStackOutputByPrefix(self.getLabelStack(), 'ExportsOutputFnGetAttlabelFunction')
        
    def getMessageLambdaArn(self):
        return self.getStackOutputByPrefix(self.getMessageStack(), 'ExportsOutputFnGetAttmessageFunction')

    def getDefaultArtifactLambdaArn(self):
        return self.getStackOutputByPrefix(self.getImageArtifactStack(), 'ExportsOutputFnGetAttdefaultArtifactFunction')
        
    def getEmbeddingConfigurationLambdaArn(self):
        return self.getStackOutputByPrefix(self.getEmbeddingConfigurationStack(), 'ExportsOutputFnGetAttembeddingConfigurationFunction')

    def getTrainingConfigurationLambdaArn(self):
        return self.getStackOutputByPrefix(self.getTrainingConfigurationStack(), 'ExportsOutputFnGetAtttrainingConfigurationFunction')

    def getArtifactLambdaArn(self):
        return self.getStackOutputByPrefix(self.getArtifactStack(), 'ExportsOutputFnGetAttartifactFunction')
        
    def getImageManagementLambdaArn(self):
        return self.getStackOutputByPrefix(self.getImageManagementStack(), 'ExportsOutputFnGetAttimageManagementFunction')

##### BATCH QUEUE

    def getBatchOnDemandQueueName(self):
        return self.getStackOutputByPrefix(self.getBatchSetupStack(), 'batchOnDemandQueueName')
        
    def getBatchSpotQueueName(self):
        return self.getStackOutputByPrefix(self.getBatchSetupStack(), 'batchSpotQueueName')
        
##### BATCH JOB DEFINITIONS

    def getPlatePreprocessingJobDefnArn(self):
        return self.getStackOutputByPrefix(self.getPlatePreprocessingStack(), 'platePreprocessingJobDefinitionArn')


####### CLIENTS

def client(serviceName):
    if serviceName == 'configuration':
        return ConfigurationClient()
    elif serviceName == 'label':
        return LabelClient()
    elif serviceName == 'message':
        return MessageClient()
    elif serviceName == 'image-artifact':
        return ImageArtifactClient()
    elif serviceName == 'plate-preprocessing':
        return PlatePreprocessingClient()
    elif serviceName == 'embedding-configuration':
        return EmbeddingConfigurationClient()
    elif serviceName == 'training-configuration':
        return TrainingConfigurationClient()
    elif serviceName == 'artifact':
        return ArtifactClient()
    elif serviceName == 'image-management':
        return ImageManagementClient()
    else:
        print('service type {} not recognized'.format(serviceName))
        return False

class BioimageSearchClient:
    def __init__(self):
        self._resources=BioimageSearchResources()
        self._resources.refresh()
        
    def getBatchOnDemandQueueName(self):
        return self._resources.getBatchOnDemandQueueName()
        
    def getBatchSpotQueueName(self):
        return self._resources.getBatchSpotQueueName()
        
        
        
#############################################
#
# UTILITIES
#
#############################################

def getResponseBody(response):
    if response['StatusCode']>299:
        raise Exception("lambda error")
    stream = response['Payload']
    bStrResponse = stream.read()
    strResponse = bStrResponse.decode("utf-8")
    if strResponse:
        jresponse = json.loads(strResponse)
        statusCode = jresponse['statusCode']
        if statusCode > 299:
            errMsg = "Error: " + jresponse['body']
            raise Exception(errMsg)
        return jresponse['body']
    else:
        return "";

#############################################
#
# CONFIGURATION
#
#############################################

class ConfigurationClient(BioimageSearchClient):
    def __init__(self):
        super().__init__()

    def getLambdaArn(self):
        return self._resources.getConfigurationLambdaArn()

    def setParameter(self, key, value):
        request = '{{ "method": "setParameter", "key": "{}", "value": "{}" }}'.format(key, value)
        payload = bytes(request, encoding='utf-8')
        lambdaClient = boto3.client('lambda')
        response = lambdaClient.invoke(
            FunctionName=self.getLambdaArn(),
            InvocationType='RequestResponse',
            Payload=payload
            )
        return getResponseBody(response)

    def getParameter(self, key):
        request = '{{ "method": "getParameter", "key": "{}" }}'.format(key)
        payload = bytes(request, encoding='utf-8')
        lambdaClient = boto3.client('lambda')
        response = lambdaClient.invoke(
            FunctionName=self.getLambdaArn(),
            InvocationType='RequestResponse',
            Payload=payload
            )
        jbody = getResponseBody(response)
        item =jbody['Item']
        value = item['value']
        return value

    def getAll(self):
        request = '{ "method": "getAll" }'
        payload = bytes(request, encoding='utf-8')
        lambdaClient = boto3.client('lambda')
        response = lambdaClient.invoke(
            FunctionName=self.getLambdaArn(),
            InvocationType='RequestResponse',
            Payload=payload
            )
        jbody = getResponseBody(response)
        jvalue = json.loads(jbody)
        d = {}
        for j in jvalue:
            d[j['key1']]=j['value']
        return d

    def getHistory(self, key):
        request = '{{ "method": "getHistory", "key": "{}" }}'.format(key)
        payload = bytes(request, encoding='utf-8')
        lambdaClient = boto3.client('lambda')
        response = lambdaClient.invoke(
            FunctionName=self.getLambdaArn(),
            InvocationType='RequestResponse',
            Payload=payload
            )
        jbody = getResponseBody(response)
        jvalue = json.loads(jbody)
        a = []
        for j in jvalue:
            if (j['timestamp1']!='LATEST'):
                t = (int(j['timestamp1']), j['key1'], j['value'])
                a.append(t)
        a.sort(key=lambda tup: tup[0])
        return a

    def getDefaultTrainId(self):
        request = '{ "method": "getDefaultTrainId"}'
        payload = bytes(request, encoding='utf-8')
        lambdaClient = boto3.client('lambda')
        response = lambdaClient.invoke(
            FunctionName=self.getLambdaArn(),
            InvocationType='RequestResponse',
            Payload=payload
            )
        return getResponseBody(response)        

    def setDefaultTrainId(self, value):
        request = '{{ "method": "setDefaultTrainId", "value": "{}" }}'.format(value)
        payload = bytes(request, encoding='utf-8')
        lambdaClient = boto3.client('lambda')
        response = lambdaClient.invoke(
            FunctionName=self.getLambdaArn(),
            InvocationType='RequestResponse',
            Payload=payload
            )
        return getResponseBody(response)

    def deleteParameter(self, key):
        request = '{{ "method": "deleteParameter", "key": "{}" }}'.format(key)
        payload = bytes(request, encoding='utf-8')
        lambdaClient = boto3.client('lambda')
        response = lambdaClient.invoke(
            FunctionName=self.getLambdaArn(),
            InvocationType='RequestResponse',
            Payload=payload
            )
        return getResponseBody(response)
        
#############################################
#
# LABEL
#
#############################################


class LabelClient(BioimageSearchClient):
    def __init__(self):
        super().__init__()

    def getLambdaArn(self):
        return self._resources.getLabelLambdaArn()

    def createCategory(self, category, description):
        request = '{{ "method": "createCategory", "category": "{}", "description": "{}" }}'.format(category, description)
        payload = bytes(request, encoding='utf-8')
        lambdaClient = boto3.client('lambda')
        response = lambdaClient.invoke(
            FunctionName=self.getLambdaArn(),
            InvocationType='Event',
            Payload=payload
            )
        return getResponseBody(response)

    def updateCategoryDescription(self, category, description):
        request = '{{ "method": "updateCategoryDescription", "category": "{}", "description": "{}" }}'.format(category, description)
        payload = bytes(request, encoding='utf-8')
        lambdaClient = boto3.client('lambda')
        response = lambdaClient.invoke(
            FunctionName=self.getLambdaArn(),
            InvocationType='Event',
            Payload=payload
            )
        return getResponseBody(response)

    def deleteCategory(self, category):
        request = '{{ "method": "deleteCategory", "category": "{}" }}'.format(category)
        payload = bytes(request, encoding='utf-8')
        lambdaClient = boto3.client('lambda')
        response = lambdaClient.invoke(
            FunctionName=self.getLambdaArn(),
            InvocationType='Event',
            Payload=payload
            )
        return getResponseBody(response)

    def createLabel(self, category, label):
        request = '{{ "method": "createLabel", "category": "{}", "label": "{}" }}'.format(category, label)
        payload = bytes(request, encoding='utf-8')
        lambdaClient = boto3.client('lambda')
        response = lambdaClient.invoke(
            FunctionName=self.getLambdaArn(),
            InvocationType='RequestResponse',
            Payload=payload
            )
        jbody = getResponseBody(response)
        jvalue = json.loads(jbody)
        return jvalue['index']

    def updateLabel(self, category, label):
        request = '{{ "method": "updateLabel", "category": "{}", "label": "{}" }}'.format(category, label)
        payload = bytes(request, encoding='utf-8')
        lambdaClient = boto3.client('lambda')
        response = lambdaClient.invoke(
            FunctionName=self.getLambdaArn(),
            InvocationType='Event',
            Payload=payload
            )
        return getResponseBody(response)

    def getIndex(self, category, label):
        request = '{{ "method": "getIndex", "category": "{}", "label": "{}" }}'.format(category, label)
        payload = bytes(request, encoding='utf-8')
        lambdaClient = boto3.client('lambda')
        response = lambdaClient.invoke(
            FunctionName=self.getLambdaArn(),
            InvocationType='RequestResponse',
            Payload=payload
            )
        jbody = getResponseBody(response)
        jvalue = json.loads(jbody)
        return jvalue['index']

    def listCategories(self):
        request = '{ "method": "listCategories" }'
        payload = bytes(request, encoding='utf-8')
        lambdaClient = boto3.client('lambda')
        response = lambdaClient.invoke(
            FunctionName=self.getLambdaArn(),
            InvocationType='RequestResponse',
            Payload=payload
            )
        jbody = getResponseBody(response)
        jvalue = json.loads(jbody)
        a = []
        for j in jvalue:
            a.append(j['category'])
        return a
        
    def listLabels(self, category):
        request = '{{ "method": "listLabels", "category": "{}" }}'.format(category)
        payload = bytes(request, encoding='utf-8')
        lambdaClient = boto3.client('lambda')
        response = lambdaClient.invoke(
            FunctionName=self.getLambdaArn(),
            InvocationType='RequestResponse',
            Payload=payload
            )
        jbody = getResponseBody(response)
        jvalue = json.loads(jbody)
        a = []
        for j in jvalue:
            a.append(j['label'])
        return a

#############################################
#
# MESSAGE
#
#############################################
    
class MessageClient(BioimageSearchClient):
    def __init__(self):
        super().__init__()

    def getLambdaArn(self):
        return self._resources.getMessageLambdaArn()
        
    def getMessage(self, messageId):
        request = '{{ "method": "getMessage", "messageId": "{}" }}'.format(messageId)
        payload = bytes(request, encoding='utf-8')
        lambdaClient = boto3.client('lambda')
        response = lambdaClient.invoke(
            FunctionName=self.getLambdaArn(),
            InvocationType='RequestResponse',
            Payload=payload
            )
        jbody = getResponseBody(response)
        jvalue = json.loads(jbody)
        item = jvalue['Item']
        return item['detail']

    def createMessage(self, message):
        request = '{{ "method": "createMessage", "message": "{}" }}'.format(message)
        payload = bytes(request, encoding='utf-8')
        lambdaClient = boto3.client('lambda')
        response = lambdaClient.invoke(
            FunctionName=self.getLambdaArn(),
            InvocationType='RequestResponse',
            Payload=payload
            )
        jbody = getResponseBody(response)
        jvalue = json.loads(jbody)
        return jvalue['messageId']

    def listMessage(self, messageId):
        request = '{{ "method": "listMessage", "messageId": "{}" }}'.format(messageId)
        payload = bytes(request, encoding='utf-8')
        lambdaClient = boto3.client('lambda')
        response = lambdaClient.invoke(
            FunctionName=self.getLambdaArn(),
            InvocationType='RequestResponse',
            Payload=payload
            )
        jbody = getResponseBody(response)
        jvalue = json.loads(jbody)
        return jvalue

    def deleteMessage(self, messageId):
        request = '{{ "method": "deleteMessage", "messageId": "{}" }}'.format(messageId)
        payload = bytes(request, encoding='utf-8')
        lambdaClient = boto3.client('lambda')
        response = lambdaClient.invoke(
            FunctionName=self.getLambdaArn(),
            InvocationType='RequestResponse',
            Payload=payload
            )
        return getResponseBody(response)

    def addMessage(self, messageId, message):
        request = '{{ "method": "addMessage", "messageId": "{}", "message": "{}" }}'.format(messageId, message)
        payload = bytes(request, encoding='utf-8')
        lambdaClient = boto3.client('lambda')
        response = lambdaClient.invoke(
            FunctionName=self.getLambdaArn(),
            InvocationType='RequestResponse',
            Payload=payload
            )
        return getResponseBody(response)
        
#############################################
#
# IMAGE ARTIFACT
#
#############################################
    
class ImageArtifactClient(BioimageSearchClient):
    def __init__(self):
        super().__init__()

    def getLambdaArn(self):
        return self._resources.getDefaultArtifactLambdaArn()
        
    def generateDefaultArtifacts(self, inputBucket, inputKeys, outputBucket, artifactKeys, artifactSizes):
        inputKeysJson = json.dumps(inputKeys)
        artifactKeysJson = json.dumps(artifactKeys)
        artifactSizesJson = json.dumps(artifactSizes)
        request = '{{ "input_bucket": "{}", "input_keys": {}, "output_bucket": "{}", "artifact_keys": {}, "artifact_sizes": {} }}'.format(
            inputBucket, inputKeysJson, outputBucket, artifactKeysJson, artifactSizesJson)
        payload = bytes(request, encoding='utf-8')
        lambdaClient = boto3.client('lambda')
        response = lambdaClient.invoke(
            FunctionName=self.getLambdaArn(),
            InvocationType='Event',
            Payload=payload
            )
        return response
        
#############################################
#
# PLATE PREPROCESSING
#
#############################################
    
class PlatePreprocessingClient(BioimageSearchClient):
    def __init__(self):
        super().__init__()

    def getBatchJobDefinitionArn(self):
        return self._resources.getPlatePreprocessingJobDefnArn()
        
    def preprocessPlate(self, inputListBucket, inputListKey, outputFlatFieldBucket, outputFlatFieldKey, queueName):
        batchClient = boto3.client('batch')
        jobName1 = 'preprocessPlateJobName-' + shortuuid.uuid()
        response = batchClient.submit_job(
            jobName=jobName1,
            jobQueue=queueName,
            jobDefinition=self.getBatchJobDefinitionArn(),
            parameters = {
                'p1': '--imageListBucket',
                'p2': inputListBucket,
                'p3': '--imageListKey',
                'p4': inputListKey,
                'p5': '--flatFieldBucket',
                'p6': outputFlatFieldBucket,
                'p7': '--flatFieldKey',
                'p8': outputFlatFieldKey
            }
        )
        return response

#############################################
#
# EMBEDDING CONFIGURATION
#
#############################################

class EmbeddingConfigurationClient(BioimageSearchClient):
    def __init__(self):
        super().__init__()

    def getLambdaArn(self):
        return self._resources.getEmbeddingConfigurationLambdaArn()
        
    def createEmbedding(self, embedding):
        embeddingStr = json.dumps(embedding)
        request = '{{ "method": "createEmbedding", "embedding": {} }}'.format(embeddingStr)
        payload = bytes(request, encoding='utf-8')
        lambdaClient = boto3.client('lambda')
        lambdaArn = self.getLambdaArn(),
        response = lambdaClient.invoke(
            FunctionName=lambdaArn,
            InvocationType='RequestResponse',
            Payload=payload
            )
        return getResponseBody(response)
        
    def getEmbedding(self, name):
        request = '{{ "method": "getEmbedding", "name": "{}" }}'.format(name)
        payload = bytes(request, encoding='utf-8')
        lambdaClient = boto3.client('lambda')
        response = lambdaClient.invoke(
            FunctionName=self.getLambdaArn(),
            InvocationType='RequestResponse',
            Payload=payload
            )
        jbody = getResponseBody(response)
        jvalue = json.loads(jbody)
        return jvalue['Item']

    def deleteEmbedding(self, name):
        request = '{{ "method": "deleteEmbedding", "name": "{}" }}'.format(name)
        payload = bytes(request, encoding='utf-8')
        lambdaClient = boto3.client('lambda')
        response = lambdaClient.invoke(
            FunctionName=self.getLambdaArn(),
            InvocationType='Event',
            Payload=payload
            )
        return getResponseBody(response)

#############################################
#
# TRAINING CONFIGURATION
#
#############################################

class TrainingConfigurationClient(BioimageSearchClient):
    def __init__(self):
        super().__init__()

    def getLambdaArn(self):
        return self._resources.getTrainingConfigurationLambdaArn()

    def createTraining(self, training):
        trainingStr = json.dumps(training)
        request = '{{ "method": "createTraining", "training": {} }}'.format(trainingStr)
        payload = bytes(request, encoding='utf-8')
        lambdaClient = boto3.client('lambda')
        response = lambdaClient.invoke(
            FunctionName=self.getLambdaArn(),
            InvocationType='RequestResponse',
            Payload=payload
            )
        return getResponseBody(response)

    def updateTraining(self, train_id, attribute, value):
        request = '{{ "method": "updateTraining", "train_id": "{}", "attribute": "{}", "value": "{}" }}'.format(train_id, attribute, value)
        payload = bytes(request, encoding='utf-8')
        lambdaClient = boto3.client('lambda')
        response = lambdaClient.invoke(
            FunctionName=self.getLambdaArn(),
            InvocationType='RequestResponse',
            Payload=payload
            )
        return getResponseBody(response)

    def getTraining(self, train_id):
        request = '{{ "method": "getTraining", "train_id": "{}" }}'.format(train_id)
        payload = bytes(request, encoding='utf-8')
        lambdaClient = boto3.client('lambda')
        response = lambdaClient.invoke(
            FunctionName=self.getLambdaArn(),
            InvocationType='RequestResponse',
            Payload=payload
            )
        jbody = getResponseBody(response)
        jvalue = json.loads(jbody)
        return jvalue['Item']

    def deleteTraining(self, train_id):
        request = '{{ "method": "deleteTraining", "train_id": "{}" }}'.format(train_id)
        payload = bytes(request, encoding='utf-8')
        lambdaClient = boto3.client('lambda')
        response = lambdaClient.invoke(
            FunctionName=self.getLambdaArn(),
            InvocationType='Event',
            Payload=payload
            )
        return getResponseBody(response)

#############################################
#
# ARTIFACT
#
#############################################
    
class ArtifactClient(BioimageSearchClient):
    def __init__(self):
        super().__init__()

    def getLambdaArn(self):
        return self._resources.getArtifactLambdaArn()

    def getArtifacts(self, typeId, trainId):
        request = '{{ "method": "getArtifacts", "typeId": "{}", "trainId": "{}" }}'.format(typeId, trainId)
        payload = bytes(request, encoding='utf-8')
        lambdaClient = boto3.client('lambda')
        response = lambdaClient.invoke(
            FunctionName=self.getLambdaArn(),
            InvocationType='RequestResponse',
            Payload=payload
            )
        jbody = getResponseBody(response)
        jvalue = json.loads(jbody)
        return jvalue

    def createArtifact(self, artifact):
        artifactStr = json.dumps(artifact)
        request = '{{ "method": "createArtifact", "artifact": {} }}'.format(artifactStr)
        print(request)
        payload = bytes(request, encoding='utf-8')
        lambdaClient = boto3.client('lambda')
        response = lambdaClient.invoke(
            FunctionName=self.getLambdaArn(),
            InvocationType='RequestResponse',
            Payload=payload
            )
        print(response)
        return getResponseBody(response)

    def deleteArtifacts(self, typeId, trainId):
        request = '{{ "method": "deleteArtifacts", "typeId": "{}", "trainId": "{}" }}'.format(typeId, trainId)
        payload = bytes(request, encoding='utf-8')
        lambdaClient = boto3.client('lambda')
        response = lambdaClient.invoke(
            FunctionName=self.getLambdaArn(),
            InvocationType='RequestResponse',
            Payload=payload
            )
        return getResponseBody(response)

    def addAnnotation(self, typeId, trainId, s3key, annotation):
        request = '{{ "method": "addAnnotation", "typeId": "{}", "trainid": "{}", "s3key": "{}", "annotation": "{}" }}'.format(typeId, trainId, s3key, annotation)
        payload = bytes(request, encoding='utf-8')
        lambdaClient = boto3.client('lambda')
        response = lambdaClient.invoke(
            FunctionName=self.getLambdaArn(),
            InvocationType='RequestResponse',
            Payload=payload
            )
        return getResponseBody(response)
        
#############################################
#
# IMAGE MANAGEMENT
#
#############################################
    
class ImageManagementClient(BioimageSearchClient):
    def __init__(self):
        super().__init__()

    def getLambdaArn(self):
        return self._resources.getImageManagementLambdaArn()

    def processPlate(self, inputBucket, inputKey):
        request = '{{ "method": "processPlate", "inputBucket": "{}", "inputKey": "{}" }}'.format(inputBucket, inputKey)
        payload = bytes(request, encoding='utf-8')
        lambdaClient = boto3.client('lambda')
        response = lambdaClient.invoke(
            FunctionName=self.getLambdaArn(),
            InvocationType='RequestResponse',
            Payload=payload
            )
        jbody = getResponseBody(response)
        jvalue = json.loads(jbody)
        return jvalue
        
    def getImagesByPlateId(self, plateId):
        request = '{{ "method": "getImagesByPlateId", "plateId": "{}" }}'.format(plateId)
        payload = bytes(request, encoding='utf-8')
        lambdaClient = boto3.client('lambda')
        response = lambdaClient.invoke(
            FunctionName=self.getLambdaArn(),
            InvocationType='RequestResponse',
            Payload=payload
            )
        jbody = getResponseBody(response)
        jvalue = json.loads(jbody)
        return jvalue
        
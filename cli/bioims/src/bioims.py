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
        
    def getTrainingConfigurationStack(self):
        return self.getStackByName('BioimageSearchTrainingConfigurationStack')
        
    def getArtifactStack(self):
        return self.getStackByName('BioimageSearchArtifactStack')
        
    def getImageManagementStack(self):
        return self.getStackByName('BioimageSearchImageManagementStack')
        
    def getProcessPlateStack(self):
        return self.getStackByName('BioimageSearchProcessPlateStack')

    def getTrainStack(self):
        return self.getStackByName('BioimageSearchTrainStack')
        
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
        
    def getTrainingConfigurationLambdaArn(self):
        return self.getStackOutputByPrefix(self.getTrainingConfigurationStack(), 'ExportsOutputFnGetAtttrainingConfigurationFunction')

    def getArtifactLambdaArn(self):
        return self.getStackOutputByPrefix(self.getArtifactStack(), 'ExportsOutputFnGetAttartifactFunction')
        
    def getImageManagementLambdaArn(self):
        return self.getStackOutputByPrefix(self.getImageManagementStack(), 'ExportsOutputFnGetAttimageManagementFunction')

    def getProcessPlateLambdaArn(self):
        return self.getStackOutputByPrefix(self.getProcessPlateStack(), 'ExportsOutputFnGetAttprocessPlateFunction')
        
    def getTrainLambdaArn(self):
        return self.getStackOutputByPrefix(self.getTrainStack(), 'ExportsOutputFnGetAtttrainFunction')
        #return self.getStackOutputByPrefix(self.getTrainStack(), 'trainLambda')

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
    elif serviceName == 'training-configuration':
        return TrainingConfigurationClient()
    elif serviceName == 'artifact':
        return ArtifactClient()
    elif serviceName == 'image-management':
        return ImageManagementClient()
    elif serviceName == 'process-plate':
        return ProcessPlateClient()
    elif serviceName == 'train':
        return TrainClient()
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

def getResponseBodyAsJson(response):
    if response['StatusCode']>299:
        raise Exception("lambda error")
    stream = response['Payload']
    bStrResponse = stream.read()
    strResponse = bStrResponse.decode("utf-8")
    if strResponse:
        try:
            jresponse = json.loads(strResponse)
        except:
            return strResponse
        if "statusCode" not in jresponse:
            errMsg = "Missing statusCode - message: " + strResponse
            raise Exception(errMsg)
        statusCode = jresponse['statusCode']
        if statusCode > 299:
            errMsg = "Error: " + jresponse['body']
            print(errMsg)
            raise Exception(errMsg)
        jbody = jresponse['body']
        if type(jbody) is str:
            try:
                jvalue = json.loads(jbody)
            except:
                return jbody
        else:
            jvalue = jbody
        return jvalue
    else:
        return "{}";

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
        return getResponseBodyAsJson(response)

    def getParameter(self, key):
        request = '{{ "method": "getParameter", "key": "{}" }}'.format(key)
        payload = bytes(request, encoding='utf-8')
        lambdaClient = boto3.client('lambda')
        response = lambdaClient.invoke(
            FunctionName=self.getLambdaArn(),
            InvocationType='RequestResponse',
            Payload=payload
            )
        jbody = getResponseBodyAsJson(response)
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
        jbody = getResponseBodyAsJson(response)
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
        jbody = getResponseBodyAsJson(response)
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
        return getResponseBodyAsJson(response)        

    def setDefaultTrainId(self, value):
        request = '{{ "method": "setDefaultTrainId", "value": "{}" }}'.format(value)
        payload = bytes(request, encoding='utf-8')
        lambdaClient = boto3.client('lambda')
        response = lambdaClient.invoke(
            FunctionName=self.getLambdaArn(),
            InvocationType='RequestResponse',
            Payload=payload
            )
        return getResponseBodyAsJson(response)

    def deleteParameter(self, key):
        request = '{{ "method": "deleteParameter", "key": "{}" }}'.format(key)
        payload = bytes(request, encoding='utf-8')
        lambdaClient = boto3.client('lambda')
        response = lambdaClient.invoke(
            FunctionName=self.getLambdaArn(),
            InvocationType='RequestResponse',
            Payload=payload
            )
        return getResponseBodyAsJson(response)
        
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
        return getResponseBodyAsJson(response)

    def updateCategoryDescription(self, category, description):
        request = '{{ "method": "updateCategoryDescription", "category": "{}", "description": "{}" }}'.format(category, description)
        payload = bytes(request, encoding='utf-8')
        lambdaClient = boto3.client('lambda')
        response = lambdaClient.invoke(
            FunctionName=self.getLambdaArn(),
            InvocationType='Event',
            Payload=payload
            )
        return getResponseBodyAsJson(response)

    def deleteCategory(self, category):
        request = '{{ "method": "deleteCategory", "category": "{}" }}'.format(category)
        payload = bytes(request, encoding='utf-8')
        lambdaClient = boto3.client('lambda')
        response = lambdaClient.invoke(
            FunctionName=self.getLambdaArn(),
            InvocationType='Event',
            Payload=payload
            )
        return getResponseBodyAsJson(response)

    def createLabel(self, category, label):
        request = '{{ "method": "createLabel", "category": "{}", "label": "{}" }}'.format(category, label)
        payload = bytes(request, encoding='utf-8')
        lambdaClient = boto3.client('lambda')
        response = lambdaClient.invoke(
            FunctionName=self.getLambdaArn(),
            InvocationType='RequestResponse',
            Payload=payload
            )
        jbody = getResponseBodyAsJson(response)
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
        return getResponseBodyAsJson(response)

    def getIndex(self, category, label):
        request = '{{ "method": "getIndex", "category": "{}", "label": "{}" }}'.format(category, label)
        payload = bytes(request, encoding='utf-8')
        lambdaClient = boto3.client('lambda')
        response = lambdaClient.invoke(
            FunctionName=self.getLambdaArn(),
            InvocationType='RequestResponse',
            Payload=payload
            )
        jbody = getResponseBodyAsJson(response)
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
        jbody = getResponseBodyAsJson(response)
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
        jbody = getResponseBodyAsJson(response)
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
        jbody = getResponseBodyAsJson(response)
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
        jbody = getResponseBodyAsJson(response)
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
        jbody = getResponseBodyAsJson(response)
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
        return getResponseBodyAsJson(response)

    def addMessage(self, messageId, message):
        request = '{{ "method": "addMessage", "messageId": "{}", "message": "{}" }}'.format(messageId, message)
        payload = bytes(request, encoding='utf-8')
        lambdaClient = boto3.client('lambda')
        response = lambdaClient.invoke(
            FunctionName=self.getLambdaArn(),
            InvocationType='RequestResponse',
            Payload=payload
            )
        return getResponseBodyAsJson(response)
        
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
        return getResponseBodyAsJson(response)

    def updateTraining(self, train_id, attribute, value):
        request = '{{ "method": "updateTraining", "trainId": "{}", "attribute": "{}", "value": "{}" }}'.format(train_id, attribute, value)
        payload = bytes(request, encoding='utf-8')
        lambdaClient = boto3.client('lambda')
        response = lambdaClient.invoke(
            FunctionName=self.getLambdaArn(),
            InvocationType='RequestResponse',
            Payload=payload
            )
        return getResponseBodyAsJson(response)

    def getTraining(self, train_id):
        request = '{{ "method": "getTraining", "trainId": "{}" }}'.format(train_id)
        payload = bytes(request, encoding='utf-8')
        lambdaClient = boto3.client('lambda')
        response = lambdaClient.invoke(
            FunctionName=self.getLambdaArn(),
            InvocationType='RequestResponse',
            Payload=payload
            )
        jbody = getResponseBodyAsJson(response)
        return jbody['Item']

    def deleteTraining(self, train_id):
        request = '{{ "method": "deleteTraining", "trainId": "{}" }}'.format(train_id)
        payload = bytes(request, encoding='utf-8')
        lambdaClient = boto3.client('lambda')
        response = lambdaClient.invoke(
            FunctionName=self.getLambdaArn(),
            InvocationType='Event',
            Payload=payload
            )
        return getResponseBodyAsJson(response)

    def createEmbedding(self, embedding):
        embeddingStr = json.dumps(embedding)
        request = '{{ "method": "createEmbedding", "embedding": {} }}'.format(embeddingStr)
        payload = bytes(request, encoding='utf-8')
        lambdaClient = boto3.client('lambda')
        lambdaArn = self.getLambdaArn()
        response = lambdaClient.invoke(
            FunctionName=lambdaArn,
            InvocationType='RequestResponse',
            Payload=payload
            )
        return getResponseBodyAsJson(response)
        
    def getEmbeddingInfo(self, name):
        request = '{{ "method": "getEmbeddingInfo", "embeddingName": "{}" }}'.format(name)
        payload = bytes(request, encoding='utf-8')
        lambdaClient = boto3.client('lambda')
        response = lambdaClient.invoke(
            FunctionName=self.getLambdaArn(),
            InvocationType='RequestResponse',
            Payload=payload
            )
        jbody = getResponseBodyAsJson(response)
        return jbody['Item']
        
    def getEmbeddingTrainings(self, name):
        request = '{{ "method": "getEmbeddingTrainings", "embeddingName": "{}" }}'.format(name)
        payload = bytes(request, encoding='utf-8')
        lambdaClient = boto3.client('lambda')
        response = lambdaClient.invoke(
            FunctionName=self.getLambdaArn(),
            InvocationType='RequestResponse',
            Payload=payload
            )
        jbody = getResponseBodyAsJson(response)
        jvalue = json.loads(jbody)
        return jvalue
        

    def deleteEmbedding(self, name):
        request = '{{ "method": "deleteEmbedding", "embeddingName": "{}" }}'.format(name)
        payload = bytes(request, encoding='utf-8')
        lambdaClient = boto3.client('lambda')
        response = lambdaClient.invoke(
            FunctionName=self.getLambdaArn(),
            InvocationType='Event',
            Payload=payload
            )
        return getResponseBodyAsJson(response)

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

    def getArtifacts(self, contextId, trainId):
        request = '{{ "method": "getArtifacts", "contextId": "{}", "trainId": "{}" }}'.format(contextId, trainId)
        payload = bytes(request, encoding='utf-8')
        lambdaClient = boto3.client('lambda')
        response = lambdaClient.invoke(
            FunctionName=self.getLambdaArn(),
            InvocationType='RequestResponse',
            Payload=payload
            )
        jbody = getResponseBodyAsJson(response)
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
        return getResponseBodyAsJson(response)

    def deleteArtifacts(self, contextId, trainId):
        request = '{{ "method": "deleteArtifacts", "contextId": "{}", "trainId": "{}" }}'.format(contextId, trainId)
        payload = bytes(request, encoding='utf-8')
        lambdaClient = boto3.client('lambda')
        response = lambdaClient.invoke(
            FunctionName=self.getLambdaArn(),
            InvocationType='RequestResponse',
            Payload=payload
            )
        return getResponseBodyAsJson(response)

    def addAnnotation(self, contextId, trainId, artifact, annotation):
        request = '{{ "method": "addAnnotation", "contextId": "{}", "trainId": "{}", "artifact": "{}", "annotation": "{}" }}'.format(contextId, trainId, artifact, annotation)
        payload = bytes(request, encoding='utf-8')
        lambdaClient = boto3.client('lambda')
        response = lambdaClient.invoke(
            FunctionName=self.getLambdaArn(),
            InvocationType='RequestResponse',
            Payload=payload
            )
        return getResponseBodyAsJson(response)
        
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

    def populateSourcePlate(self, inputBucket, inputKey):
        request = '{{ "method": "populateSourcePlate", "inputBucket": "{}", "inputKey": "{}" }}'.format(inputBucket, inputKey)
        payload = bytes(request, encoding='utf-8')
        lambdaClient = boto3.client('lambda')
        response = lambdaClient.invoke(
            FunctionName=self.getLambdaArn(),
            InvocationType='RequestResponse',
            Payload=payload
            )
        jbody = getResponseBodyAsJson(response)
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
        jbody = getResponseBodyAsJson(response)
        return jbody
        
    def getWellsByPlateId(self, plateId):
        request = '{{ "method": "getWellsByPlateId", "plateId": "{}" }}'.format(plateId)
        payload = bytes(request, encoding='utf-8')
        lambdaClient = boto3.client('lambda')
        response = lambdaClient.invoke(
            FunctionName=self.getLambdaArn(),
            InvocationType='RequestResponse',
            Payload=payload
            )
        jbody = getResponseBodyAsJson(response)
        return jbody

    def getImagesByWellId(self, wellId):
        request = '{{ "method": "getImagesByWellId", "wellId": "{}" }}'.format(wellId)
        payload = bytes(request, encoding='utf-8')
        lambdaClient = boto3.client('lambda')
        response = lambdaClient.invoke(
            FunctionName=self.getLambdaArn(),
            InvocationType='RequestResponse',
            Payload=payload
            )
        jbody = getResponseBodyAsJson(response)
        return jbody
        
    def getPlateImageStatus(self, plateId):
        request = '{{ "method": "getPlateImageStatus", "plateId": "{}" }}'.format(plateId)
        payload = bytes(request, encoding='utf-8')
        lambdaClient = boto3.client('lambda')
        response = lambdaClient.invoke(
            FunctionName=self.getLambdaArn(),
            InvocationType='RequestResponse',
            Payload=payload
            )
        jbody = getResponseBodyAsJson(response)
        return jbody
        
    def createPlateMessageId(self, plateId):
        request = '{{ "method": "createPlateMessageId", "plateId": "{}" }}'.format(plateId)
        payload = bytes(request, encoding='utf-8')
        lambdaClient = boto3.client('lambda')
        response = lambdaClient.invoke(
            FunctionName=self.getLambdaArn(),
            InvocationType='RequestResponse',
            Payload=payload
            )
        jbody = getResponseBodyAsJson(response)
        return jbody
        
    def getPlateMessageId(self, plateId):
        request = '{{ "method": "getPlateMessageId", "plateId": "{}" }}'.format(plateId)
        payload = bytes(request, encoding='utf-8')
        lambdaClient = boto3.client('lambda')
        response = lambdaClient.invoke(
            FunctionName=self.getLambdaArn(),
            InvocationType='RequestResponse',
            Payload=payload
            )
        jbody = getResponseBodyAsJson(response)
        return jbody

    def validatePlate(self, plateId):
        request = '{{ "method": "validatePlate", "plateId": "{}" }}'.format(plateId)
        payload = bytes(request, encoding='utf-8')
        lambdaClient = boto3.client('lambda')
        response = lambdaClient.invoke(
            FunctionName=self.getLambdaArn(),
            InvocationType='RequestResponse',
            Payload=payload
            )
        jbody = getResponseBodyAsJson(response)
        return jbody
        
    def listCompatiblePlates(self, width, height, depth, channels):
        request = '{{ "method": "listCompatiblePlates", "width": {}, "height": {}, "depth": {}, "channels": {} }}'.format(width, height, depth, channels);
        payload = bytes(request, encoding='utf-8')
        lambdaClient = boto3.client('lambda')
        response = lambdaClient.invoke(
            FunctionName=self.getLambdaArn(),
            InvocationType='RequestResponse',
            Payload=payload
            )
        jbody = getResponseBodyAsJson(response)
        return jbody
        
        
#############################################
#
# PROCESS PLATE
#
#############################################
    
class ProcessPlateClient(BioimageSearchClient):
    def __init__(self):
        super().__init__()

    def getLambdaArn(self):
        return self._resources.getProcessPlateLambdaArn()

    def processPlate(self, plateId):
        request = '{{ "method": "processPlate", "plateId": "{}" }}'.format(plateId)
        payload = bytes(request, encoding='utf-8')
        lambdaClient = boto3.client('lambda')
        response = lambdaClient.invoke(
            FunctionName=self.getLambdaArn(),
            InvocationType='RequestResponse',
            Payload=payload
            )
        jbody = getResponseBodyAsJson(response)
        jvalue = json.loads(jbody)
        return jvalue
        
    def uploadSourcePlate(self, inputBucket, inputKey):
        request = '{{ "method": "uploadSourcePlate", "inputBucket": "{}", "inputKey": "{}" }}'.format(inputBucket, inputKey)
        payload = bytes(request, encoding='utf-8')
        lambdaClient = boto3.client('lambda')
        response = lambdaClient.invoke(
            FunctionName=self.getLambdaArn(),
            InvocationType='RequestResponse',
            Payload=payload
            )
        jbody = getResponseBodyAsJson(response)
        jvalue = json.loads(jbody)
        return jvalue
        
#############################################
#
# TRAIN
#
#############################################
    
class TrainClient(BioimageSearchClient):
    def __init__(self):
        super().__init__()

    def getLambdaArn(self):
        return self._resources.getTrainLambdaArn()

    def train(self, embeddingName, filterBucket='', filterKey=''):
        request = '{{ "method": "train", "embeddingName": "{}", "filterBucket": "{}", "filterKey": "{}" }}'.format(embeddingName, filterBucket, filterKey)
        payload = bytes(request, encoding='utf-8')
        lambdaClient = boto3.client('lambda')
        response = lambdaClient.invoke(
            FunctionName=self.getLambdaArn(),
            InvocationType='RequestResponse',
            Payload=payload
            )
        jbody = getResponseBodyAsJson(response)
        return jbody
        
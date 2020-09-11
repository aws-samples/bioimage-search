import boto3
import json
import base64

class BioimageSearchResources:
    def __init__(self):
        self._stacksDescription = ""
        self._configurationLambdaArn = ""
        self._labelLambdaArn = ""

    def refresh(self):
        cf = boto3.client('cloudformation')
        self._stacksDescription = cf.describe_stacks()

    def getConfigurationStack(self):
        stacks = self._stacksDescription['Stacks']
        for stack in stacks:
            if stack['StackName'] == 'BioimageSearchConfigurationStack':
                return stack
        return ""

    def getConfigurationLambdaArn(self):
        configurationStack = self.getConfigurationStack()
        outputs = configurationStack['Outputs']
        for output in outputs:
            output_key = output['OutputKey']
            if output_key.startswith('ExportsOutputFnGetAttconfigurationFunction'):
                return output['OutputValue']
        return ""
        
    def getLabelStack(self):
        stacks = self._stacksDescription['Stacks']
        for stack in stacks:
            if stack['StackName'] == 'BioimageSearchLabelStack':
                return stack
        return ""

    def getLabelLambdaArn(self):
        labelStack = self.getLabelStack()
        outputs = labelStack['Outputs']
        for output in outputs:
            output_key = output['OutputKey']
            if output_key.startswith('ExportsOutputFnGetAttlabelFunction'):
                return output['OutputValue']
        return ""


def client(serviceName):
    if serviceName == 'configuration':
        return ConfigurationClient()
    if serviceName == 'label':
        return LabelClient()
    print('service type {} not recognized'.format(serviceName))
    return False

class BioimageSearchClient:
    def __init__(self):
        self._resources=BioimageSearchResources()
        self._resources.refresh()
        
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
            FunctionName=self._resources.getConfigurationLambdaArn(),
            InvocationType='Event',
            Payload=payload
            )
        return response['StatusCode']

    def getParameter(self, key):
        request = '{{ "method": "getParameter", "key": "{}" }}'.format(key)
        payload = bytes(request, encoding='utf-8')
        lambdaClient = boto3.client('lambda')
        response = lambdaClient.invoke(
            FunctionName=self._resources.getConfigurationLambdaArn(),
            InvocationType='RequestResponse',
            Payload=payload
            )
        stream = response['Payload']
        bStrResponse = stream.read()
        strResponse = bStrResponse.decode("utf-8")
        jresponse = json.loads(strResponse)
        jbody = jresponse['body']
        jvalue = json.loads(jbody)
        return jvalue['value']

    def getAll(self):
        request = '{ "method": "getAll" }'
        payload = bytes(request, encoding='utf-8')
        lambdaClient = boto3.client('lambda')
        response = lambdaClient.invoke(
            FunctionName=self._resources.getConfigurationLambdaArn(),
            InvocationType='RequestResponse',
            Payload=payload
            )
        stream = response['Payload']
        bStrResponse = stream.read()
        strResponse = bStrResponse.decode("utf-8")
        jresponse = json.loads(strResponse)
        jbody = jresponse['body']
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
            FunctionName=self._resources.getConfigurationLambdaArn(),
            InvocationType='RequestResponse',
            Payload=payload
            )
        stream = response['Payload']
        bStrResponse = stream.read()
        strResponse = bStrResponse.decode("utf-8")
        jresponse = json.loads(strResponse)
        jbody = jresponse['body']
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
            FunctionName=self._resources.getConfigurationLambdaArn(),
            InvocationType='RequestResponse',
            Payload=payload
            )
        stream = response['Payload']
        bStrResponse = stream.read()
        strResponse = bStrResponse.decode("utf-8")
        jresponse = json.loads(strResponse)
        jbody = jresponse['body']
        jvalue = json.loads(jbody)
        return jvalue['value']

    def setDefaultTrainId(self, value):
        request = '{{ "method": "setDefaultTrainId", "value": "{}" }}'.format(value)
        payload = bytes(request, encoding='utf-8')
        lambdaClient = boto3.client('lambda')
        response = lambdaClient.invoke(
            FunctionName=self._resources.getConfigurationLambdaArn(),
            InvocationType='Event',
            Payload=payload
            )
        return response['StatusCode']
    
    def deleteParameter(self, key):
        request = '{{ "method": "deleteParameter", "key": "{}" }}'.format(key)
        payload = bytes(request, encoding='utf-8')
        lambdaClient = boto3.client('lambda')
        response = lambdaClient.invoke(
            FunctionName=self._resources.getConfigurationLambdaArn(),
            InvocationType='Event',
            Payload=payload
            )
        return response['StatusCode']
        
#############################################
#
# LABEL
#
#############################################


# createCategory(category, description):
#     {
#         method: 'createCategory',
#         category: category,
#         description: description
#     }
    
# updateCategoryDescription(category, description):
#     {
#         method: 'updateCategoryDescription',
#         category: category,
#         description: description
#     }
    
# deleteCategory(category):
#     {
#         method: 'deleteCategory',
#         category: category
#     }
    
# createLabel(category, label):
#     {
#         method: 'createLabel',
#         category: category,
#         label: label
#     }
    
# updateLabel(category, label):
#     {
#         method: 'updateLabel',
#         category: category,
#         label: label
#     }
    
# getIndex(category, label):
#     {
#         method: 'getIndex',
#         category: category,
#         label: label
#     }
    
# listCategories():
#     {
#         method: 'listCategories'        
#     }

# listLabels(category):
#     {
#         method: 'listLabels',
#         category: category
#     }
    

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
            FunctionName=self._resources.getLabelLambdaArn(),
            InvocationType='Event',
            Payload=payload
            )
        return response['StatusCode']

    def updateCategoryDescription(self, category, description):
        request = '{{ "method": "updateCategoryDescription", "category": "{}", "description": "{}" }}'.format(category, description)
        payload = bytes(request, encoding='utf-8')
        lambdaClient = boto3.client('lambda')
        response = lambdaClient.invoke(
            FunctionName=self._resources.getLabelLambdaArn(),
            InvocationType='Event',
            Payload=payload
            )
        return response['StatusCode']

    def deleteCategory(self, category):
        request = '{{ "method": "deleteCategory", "category": "{}" }}'.format(category)
        payload = bytes(request, encoding='utf-8')
        lambdaClient = boto3.client('lambda')
        response = lambdaClient.invoke(
            FunctionName=self._resources.getLabelLambdaArn(),
            InvocationType='Event',
            Payload=payload
            )
        return response['StatusCode']

    def createLabel(self, category, label):
        request = '{{ "method": "createLabel", "category": "{}", "label": "{}" }}'.format(category, label)
        payload = bytes(request, encoding='utf-8')
        lambdaClient = boto3.client('lambda')
        response = lambdaClient.invoke(
            FunctionName=self._resources.getLabelLambdaArn(),
            InvocationType='Event',
            Payload=payload
            )
        stream = response['Payload']
        bStrResponse = stream.read()
        strResponse = bStrResponse.decode("utf-8")
        jresponse = json.loads(strResponse)
        jbody = jresponse['body']
        jvalue = json.loads(jbody)
        return jvalue['value']

    def updateLabel(self, category, label):
        request = '{{ "method": "updateLabel", "category": "{}", "label": "{}" }}'.format(category, label)
        payload = bytes(request, encoding='utf-8')
        lambdaClient = boto3.client('lambda')
        response = lambdaClient.invoke(
            FunctionName=self._resources.getLabelLambdaArn(),
            InvocationType='Event',
            Payload=payload
            )
        return response['StatusCode']

    def getIndex(self, category, label):
        request = '{{ "method": "getIndex", "category": "{}", "label": "{}" }}'.format(category, label)
        payload = bytes(request, encoding='utf-8')
        lambdaClient = boto3.client('lambda')
        response = lambdaClient.invoke(
            FunctionName=self._resources.getLabelLambdaArn(),
            InvocationType='Event',
            Payload=payload
            )
        return response['StatusCode']

    def listCategories(self):
        request = '{ "method": "listCategories" }'
        payload = bytes(request, encoding='utf-8')
        lambdaClient = boto3.client('lambda')
        response = lambdaClient.invoke(
            FunctionName=self._resources.getLabelLambdaArn(),
            InvocationType='Event',
            Payload=payload
            )
        return response['StatusCode']

    def listLabels(self, category):
        request = '{{ "method": "listLabels", "category": "{}" }}'.format(category)
        payload = bytes(request, encoding='utf-8')
        lambdaClient = boto3.client('lambda')
        response = lambdaClient.invoke(
            FunctionName=self._resources.getLabelLambdaArn(),
            InvocationType='Event',
            Payload=payload
            )
        stream = response['Payload']
        bStrResponse = stream.read()
        strResponse = bStrResponse.decode("utf-8")
        jresponse = json.loads(strResponse)
        jbody = jresponse['body']
        jvalue = json.loads(jbody)
        l = []
        for j in jvalue:
            l.append(j['label'])
        return l


import sys
import json
from random import seed
from random import randint
import boto3
sys.path.insert(0, "../src")
import bioims

configurationClient = bioims.client('configuration')

# configurationLambdaArn = configurationClient.getLambdaArn()
# print(configurationLambdaArn)
# rs = configurationClient.setParameter("key1", "value1")
# rs = configurationClient.setParameter("key2", "value2")
# rs = configurationClient.setParameter("key3", "value3")
# print(rs)
# r1 = configurationClient.getParameter("key1")
# r2 = configurationClient.getParameter("key2")
# r3 = configurationClient.getParameter("key3")
# print(r1)
# print(r2)
# print(r3)
# ra = configurationClient.getAll()
# print(ra)
# rh = configurationClient.getHistory("key3")
# print(rh)
# rst = configurationClient.setDefaultTrainId(0)
# print(rst)
# rgt = configurationClient.getDefaultTrainId()
# print(rgt)

TEST_SIZE = 100

parameterValues = {}

seed(1)

for i in range(TEST_SIZE):
    if i%10==0:
        print(i)
    keyIndex=randint(0,TEST_SIZE)
    valueIndex=randint(0,TEST_SIZE)
    key='test-key-{}'.format(keyIndex)
    value='test-value-{}'.format(valueIndex)
    if key in parameterValues:
        array=parameterValues[key]
        array.append(value)
    else:
        l = []
        l.append(value)
        parameterValues[key]=l
    configurationClient.setParameter(key, value)

for key in parameterValues:
    l = parameterValues[key]
    v = l[-1]
    dv = configurationClient.getParameter(key)
    if (dv==v):
        print("getParameter() CORRECT")
    else:
        print("---INCORRECT---")
        print('  v={} dv={}'.format(v, dv))

allKV = configurationClient.getAll()

for key in parameterValues:
    l = parameterValues[key]
    v = l[-1]
    dv = allKV[key]
    if (dv==v):
        print("getAll() CORRECT")
    else:
        print("---INCORRECT---")
        print('  v={} dv={}'.format(v, dv))







        






























import sys
import json
from random import seed
from random import randint
import boto3
sys.path.insert(0, "../src")
import bioims

configurationClient = bioims.client('configuration')

# TEST_SIZE = 20

# parameterValues = {}

# seed(1)

# for i in range(TEST_SIZE):
#     if i%10==0:
#         print(i)
#     keyIndex=randint(0,TEST_SIZE)
#     valueIndex=randint(0,TEST_SIZE)
#     key='test-key-{}'.format(keyIndex)
#     value='test-value-{}'.format(valueIndex)
#     if key in parameterValues:
#         array=parameterValues[key]
#         array.append(value)
#     else:
#         l = []
#         l.append(value)
#         parameterValues[key]=l
#     configurationClient.setParameter(key, value)

# for key in parameterValues:
#     l = parameterValues[key]
#     v = l[-1]
#     dv = configurationClient.getParameter(key)
#     if (dv==v):
#         print("getParameter() CORRECT")
#     else:
#         print("---INCORRECT---")
#         print('  v={} dv={}'.format(v, dv))

# allKV = configurationClient.getAll()
# for key in allKV:
#     print(key)
#     r = configurationClient.deleteParameter(key)
#     print(r)

CONFIG_ROI_SIZE = "image-preprocessing-roi-size"

r = configurationClient.getParameter(CONFIG_ROI_SIZE)

print(r)
























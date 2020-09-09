import sys
import json
import boto3
sys.path.insert(0, "../src")
import bioims

configurationClient = bioims.client('configuration')

configurationLambdaArn = configurationClient.getLambdaArn()

print(configurationLambdaArn)

rs = configurationClient.setParameter("key3", "value3")

print(rs)

r1 = configurationClient.getParameter("key1")

r2 = configurationClient.getParameter("key2")

r3 = configurationClient.getParameter("key3")

print(r1)

print(r2)

print(r3)

ra = configurationClient.getAll()

print(ra)

rh = configurationClient.getHistory("key3")

print(rh)

rst = configurationClient.setDefaultTrainId(0)

print(rst)

rgt = configurationClient.getDefaultTrainId()

print(rgt)






















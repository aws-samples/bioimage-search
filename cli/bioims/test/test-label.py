import sys
import json
from random import seed
from random import randint
import boto3
sys.path.insert(0, "../src")
import bioims

labelClient = bioims.client('label')

seed(1)

labelClient.createCategory("category2", "description1")

for i in range(10):
    r = labelClient.createLabel("category2", "label"+str(i))
    print(r)

#r = labelClient.listLabels("category1")


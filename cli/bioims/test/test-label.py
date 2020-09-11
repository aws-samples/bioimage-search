import sys
import json
from random import seed
from random import randint
import boto3
sys.path.insert(0, "../src")
import bioims

labelClient = bioims.client('label')

seed(1)

labelClient.createCategory("category1", "description1")


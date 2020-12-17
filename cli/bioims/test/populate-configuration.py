import sys
import json
from random import seed
from random import randint
import boto3
sys.path.insert(0, "../src")
import bioims

configurationClient = bioims.client('configuration')

configurationClient.setParameter("default-image-artifact-medium-size-pixels", "1000")
configurationClient.setParameter("default-image-artifact-thumbnail-size-pixels", "100")

import sys
import json
import boto3
sys.path.insert(0, "../src")
import bioims

searchClient = bioims.client('search')

r = searchClient.loadTagLabelMap();
print(r)

r = searchClient.startTagLoad('bbbc021-1')
print(r)


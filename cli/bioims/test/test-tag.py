import sys
import json
import boto3
sys.path.insert(0, "../src")
import bioims

tagClient = bioims.client('tag')

for i in range(10):
    tag = 'testTag_{}'.format(i)
    r = tagClient.createTag(tag)
    print(r)
    
for i in range(10):
    tag = 'testTag_{}'.format(i)
    r = tagClient.getTagByValue(tag)
    print(r)
    
for i in range(10):
    tag = 'testTag_{}'.format(i)
    r = tagClient.getTagById(i)
    print(r)
    
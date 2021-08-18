import sys
import json
import boto3
sys.path.insert(0, "../src")
import bioims

searchClient = bioims.client('search')

r = searchClient.loadTagLabelMap();
print(r)

r = searchClient.startTagLoad('bbbc021')
print(r)

# trainId = 'hqTvRAmUVR5amUiAABqv85'
# imageId = 'bgzxxYiiuKEYawB7wEX8pW'
# r = searchClient.searchByImageId(trainId, imageId)
# print(r)

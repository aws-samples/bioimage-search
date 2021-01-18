import sys
import json
import boto3
sys.path.insert(0, "../src")
import bioims

# Inputs
trainId = "r6KEudzQCuUtDwCzziiMZT"
imageId = "17Sk8AHeX1idyJDBnMwEhX"

searchClient = bioims.client('search')

search = {
    "trainId" : trainId,
    "queryImageId" : imageId
}

r = searchClient.submitSearch(search)

print(r)

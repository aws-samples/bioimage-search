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

#r = searchClient.submitSearch(search)

#r = imageManagementClient.getImagesByPlateIdAndTrainId('gXc3iRxAi4rs5AdwQpYeiZ','r6KEudzQCuUtDwCzziiMZT')

r = searchClient.processPlate('r6KEudzQCuUtDwCzziiMZT','gXc3iRxAi4rs5AdwQpYeiZ')

print(r)

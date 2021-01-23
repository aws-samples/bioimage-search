import sys
import json
import boto3
sys.path.insert(0, "../src")
import bioims
import numpy as np
import base64

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
#print(r)

e64 = b'7s/RPJ/sR74ntj++Fc0EvcFMMb7faKm8nK3cvXGv+T0KyYO9qDYEvup/gL68tye+P1oEvksfxD3mdgi+o900PipMj71ag+o8aJrpPVyRfT0u88C82pRHPuj/FD4xJQI+eUcdPjIgv73L4Ba+UwKVu+49tT0YUoQ7cvcmO8j6Yj0='
e64d = base64.decodebytes(e64)
e2 = np.frombuffer(e64d, dtype=np.float32)
print(e2)

# np1 = np.zeros( (4), dtype=np.float32)

# np1[0] = 0.0
# np1[1] = 1.0
# np1[2] = 2.0
# np1[3] = 3.0

# np164 = base64.b64encode(np1)

# np1d = base64.decodebytes(np164)

# np2 = np.frombuffer(np1d, dtype=np.float32)

# print(np1)

# print(np164)

# print(np2)

# isOk = np.allclose(np1, np2)

# print(isOk)

# trainId, plateId
#r = searchClient.processPlate('r6KEudzQCuUtDwCzziiMZT','gXc3iRxAi4rs5AdwQpYeiZ')
#print(r)

r = searchClient.startTrainingLoad('r6KEudzQCuUtDwCzziiMZT')
print(r)

#r = searchClient.searchByImageId('r6KEudzQCuUtDwCzziiMZT', '17Sk8AHeX1idyJDBnMwEhX')
#print(r)

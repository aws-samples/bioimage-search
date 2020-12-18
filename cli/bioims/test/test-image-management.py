import sys
import json
import boto3
import io
sys.path.insert(0, "../src")
import bioims

TEST_INPUT_BUCKET = "bioimage-search-input"
TEST_OUTPUT_BUCKET = "bioimage-search-output"

trainingConfigurationClient = bioims.client('training-configuration')
imageManagementClient = bioims.client('image-management')

# NOTE: 'origin' is not actually a valid trainId

# training = {
#     "train_id": "origin",
#     "filterBucket": "bioimage-search-input",
#     "filterIncludeKey": "",
#     "filterExcludeKey": "",
#     "embeddingName": "embedding-name1",
#     "sagemakerTrainId": "sagemaker-train-id1",
#     "trainMessageId": "train-message-id1",
#     "modelBucket" : "model-bucket1",
#     "modelKey" : "model-key1"
# }

#  SourcePlateInfo {
#     plateSourceId: <string>
#     images: [
#       wellSourceId: <string>
#       imageSourceId: <string>
#       sourceBucket: <string>
#       sourceKey: <string>
#       category: <string - optional>
#       label: <string - optional>
#       experiment: <string - optional>
#     ]
#   }

# plateSourceInfo = {
#     "plateSourceId" : "plateSourceId-1",
#     "images" : [
#             {
#                 "wellSourceId" : "wellSourceId-1",
#                 "imageSourceId" : "imageSourceId-1",
#                 "sourceBucket" : "sourceBucket-1",
#                 "sourceKey" : "sourceKey-1",
#                 "experiment" : "experiment-1",
#                 "category" : "category-1",
#                 "label" : "label-1"
#             },
#             {
#                 "wellSourceId" : "wellSourceId-2",
#                 "imageSourceId" : "imageSourceId-2",
#                 "sourceBucket" : "sourceBucket-2",
#                 "sourceKey" : "sourceKey-2",
#                 "experiment" : "experiment-2",
#                 "category" : "category-2",
#                 "label" : "label-2"
#             }
#         ]
# }

#s3 = boto3.client('s3')

#stringBuffer = io.StringIO()

#stringBuffer.write(json.dumps(plateSourceInfo))

# ioBuffer = io.BytesIO(stringBuffer.getvalue().encode())

# plateSourceKey = "plateSourceKey.json"

#plateSourceKey = "SourcePlateInfo_Week1_22123.json"a

# s3.upload_fileobj(ioBuffer, TEST_INPUT_BUCKET, plateSourceKey)

#r = trainingConfigurationClient.createTraining(training)

#print(r)

#plateManifestKey = "plateManifestKey.json"

#r = imageManagementClient.uploadSourcePlate(TEST_INPUT_BUCKET, plateSourceKey)

#print(r)

##################################################

#plateId = 'edZqhahFK8cWqvyJsot4zW'

#r = imageManagementClient.validatePlate(plateId)

#print(r)

#r = imageManagementClient.listCompatiblePlates(1280, 1024, 1, 3)

#print(r)

#r = imageManagementClient.getPlateMessageId('dzqwTuqgLxmz2vmjGeyZHD')

# print("getWellsByPlateId():")

# r = imageManagementClient.getWellsByPlateId('vjv3j3DusLBmRehT46fbg3')

# print(r)

# print("getImagesByPlateAndWellId():")

# r = imageManagementClient.getImagesByPlateAndWellId('vjv3j3DusLBmRehT46fbg3', 'qqc4XGQCBtTL5jJBQxYvR7')

# print(r)

r = imageManagementClient.getImageInfo('115kKdtCLvJ9HodXCQDrU6', 'origin')

print(r)

import sys
import json
import boto3
sys.path.insert(0, "../src")
import bioims

trainClient = bioims.client('train')

# Embedding
# const PLATE_PROCESSING_ARN_ATTRIBUTE = "plateMethodArn";
# const WELL_PROCESSING_ARN_ATTRIBUTE = "wellMethodArn";
# const IMAGE_PROCESSING_ARN_ATTRIBUTE = "imageMethodArn";
# const IMAGE_POST_PROCESSING_ARN_ATTRIBUTE = "imagePostMethodArn";
# const MODEL_TRAINING_SCRIPT_BUCKET_ATTRIBUTE = "modelTrainingScriptBucket";
# const MODEL_TRAINING_SCRIPT_KEY_ATTRIBUTE = "modelTrainingScriptKey";
# const TRAINING_HYPERPARAMETERS_ATTRIBUTE = "trainingHyperparameters";
# const INPUT_HEIGHT_ATTRIBUTE = "inputHeight";
# const INPUT_WIDTH_ATTRIBUTE = "inputWidth";
# const INPUT_DEPTH_ATTRIBUTE = "inputDepth";
# const INPUT_CHANNELS_ATTRIBUTE = "inputChannels";
# const ROI_HEIGHT_ATTRIBUTE = "roiHeight";
# const ROI_WIDTH_ATTRIBUTE = "roiWidth";
# const ROI_DEPTH_ATTRIBUTE = "roiDepth";
# const EMBEDDING_VECTOR_LENGTH_ATTRIBUTE = "embeddingVectorLength";
# const COMMENTS_ATTRIBUTE = "comments";

# Training
# const FILTER_BUCKET_ATTRIBUTE = "filterBucket";
# const FILTER_INCLUDE_KEY_ATTRIBUTE = "filterIncludeKey";
# const FILTER_EXCLUDE_KEY_ATTRIBUTE = "filterExcludeKey";
# const SAGEMAKER_TRAIN_ID_ATTRIBUTE = "sagemakerTrainId";
# const TRAINING_JOB_MESSAGE_ID_ATTRIBUTE = "trainMessageId";
# const MODEL_BUCKET_ATTRIBUTE = "modelBucket";
# const MODEL_KEY_ATTRIBUTE = "modelKey"

# embedding = {
#     "embeddingName" : "bbbc021",
#     "plateMethodArn" : "plateMethodArn-placeholder",
#     "wellMethodArn" : "wellMethodArn-placeholder",
#     "imageMethodArn" : "imageMethodArn-placeholder",
#     "imagePostMethodArn" : "imagePostMethodArn-placeholder",
#     "modelTrainingScriptBucket" : "bioimage-search-input",
#     "modelTrainingScriptKey" : "bbbc021-train-script.py",
#     "trainingHyperparameters" : {
#         'epochs': 15,
#         'backend': 'gloo',
#         'seed': 1,
#         'batch_size': 1
#     },
#     "inputHeight" : 1024,
#     "inputWidth" : 1280,
#     "inputDepth" : 1,
#     "inputChannels" : 3,
#     "roiHeight" : 128,
#     "roiWidth" : 128,
#     "roiDepth" : 1,
#     "embeddingVectorLength" : 256,
#     "comments" : ""
# }

#r = trainClient.train('bbbc021')
#print(r)

#trainId = "ekNybBbTHtwVsGJRgWznfi"
#r = trainClient.startTrainingBuild(trainId)

# filterBucket = 'bioimage-search-input'
# filterKey = 'train-filter/DMSO-filter.txt'
# r = trainClient.train('bbbc021', filterBucket, filterKey)
# print(r)

#trainId = "ekNybBbTHtwVsGJRgWznfi"
#trainId = "a93CYC7ipUDADnxe8V5ZRK"
#trainId = "r6KEudzQCuUtDwCzziiMZT"
#r = trainClient.startTrainingCompute(trainId)
#print(r)

### Re-test of training script
# trainId = "r6KEudzQCuUtDwCzziiMZT"
# r = trainClient.startTrainingCompute(trainId)
# print(r)

### Start moa test

# aws s3 ls s3://bioimage-search-input/train-filter/
# 2208 ALLN-filter.txt
# 2208 AZ-A-filter.txt
# 2208 AZ-C-filter.txt
# 2208 AZ-J-filter.txt
# 2208 AZ-U-filter.txt
# 2208 AZ138-filter.txt
# 2208 AZ258-filter.txt
# 2208 AZ841-filter.txt
# 30360 DMSO-filter.txt
# 2208 MG-132-filter.txt
# 1472 PD-169316-filter.txt
# 1472 PP-2-filter.txt
# 1472 alsterpaullone-filter.txt
# 2208 anisomycin-filter.txt
# 1472 bryostatin-filter.txt
# 2208 camptothecin-filter.txt
# 2208 chlorambucil-filter.txt
# 2208 cisplatin-filter.txt
# 2208 colchicine-filter.txt
# 2208 cyclohexamide-filter.txt
# 2208 cytochalasinB-filter.txt
# 2208 cytochalasinD-filter.txt
# 2208 demecolcine-filter.txt
# 2208 docetaxel-filter.txt
# 2208 emetine-filter.txt
# 2208 epothiloneB-filter.txt
# 2208 etoposide-filter.txt
# 2208 floxuridine-filter.txt
# 2208 lactacystin-filter.txt
# 2208 latrunculinB-filter.txt
# 2208 methotrexate-filter.txt
# 2208 mevinolin-lovastatin-filter.txt
# 2208 mitomycinC-filter.txt
# 2208 mitoxantrone-filter.txt
# 2208 nocodazole-filter.txt
# 2208 proteasomeinhibitorI-filter.txt
# 2208 simvastatin-filter.txt
# 32568 taxol-filter.txt
# 2208 vincristine-filter.txt

# started 6:46pm
# filterBucket = 'bioimage-search-input'
# filterKey = 'train-filter/ALLN-filter.txt'
# r = trainClient.train('bbbc021', filterBucket, filterKey)
# print(r)

# started 7:02pm
# filterBucket = 'bioimage-search-input'
# filterKey = 'train-filter/AZ-A-filter.txt'
# r = trainClient.train('bbbc021', filterBucket, filterKey)
# print(r)

# started 7:02pm
# filterBucket = 'bioimage-search-input'
# filterKey = 'train-filter/AZ-C-filter.txt'
# r = trainClient.train('bbbc021', filterBucket, filterKey)
# print(r)

# started 7:13pm
# filterBucket = 'bioimage-search-input'
# filterKey = 'train-filter/AZ-J-filter.txt'
# r = trainClient.train('bbbc021', filterBucket, filterKey)
# print(r)

# started 7:13pm
# filterBucket = 'bioimage-search-input'
# filterKey = 'train-filter/AZ-U-filter.txt'
# r = trainClient.train('bbbc021', filterBucket, filterKey)
# print(r)

# started 7:13pm
# filterBucket = 'bioimage-search-input'
# filterKey = 'train-filter/AZ138-filter.txt'
# r = trainClient.train('bbbc021', filterBucket, filterKey)
# print(r)

# started 7:23pm
# filterBucket = 'bioimage-search-input'
# filterKey = 'train-filter/AZ258-filter.txt'
# r = trainClient.train('bbbc021', filterBucket, filterKey)
# print(r)

# started 7:23pm
# filterBucket = 'bioimage-search-input'
# filterKey = 'train-filter/AZ841-filter.txt'
# r = trainClient.train('bbbc021', filterBucket, filterKey)
# print(r)

# started 7:23pm
# filterBucket = 'bioimage-search-input'
# filterKey = 'train-filter/MG-132-filter.txt'
# r = trainClient.train('bbbc021', filterBucket, filterKey)
# print(r)

# started 7:23pm
# filterBucket = 'bioimage-search-input'
# filterKey = 'train-filter/PD-169316-filter.txt'
# r = trainClient.train('bbbc021', filterBucket, filterKey)
# print(r)

# 1472 PP-2-filter.txt
# 1472 alsterpaullone-filter.txt
# 2208 anisomycin-filter.txt
# 1472 bryostatin-filter.txt
# 2208 camptothecin-filter.txt

# started 8:15pm
# filterBucket = 'bioimage-search-input'
# filterKey = 'train-filter/PP-2-filter.txt'
# r = trainClient.train('bbbc021', filterBucket, filterKey)
# print(r)

# started 8:15pm
# filterBucket = 'bioimage-search-input'
# filterKey = 'train-filter/alsterpaullone-filter.txt'
# r = trainClient.train('bbbc021', filterBucket, filterKey)
# print(r)

# started 8:15pm
# filterBucket = 'bioimage-search-input'
# filterKey = 'train-filter/anisomycin-filter.txt'
# r = trainClient.train('bbbc021', filterBucket, filterKey)
# print(r)

# started 8:15pm
# filterBucket = 'bioimage-search-input'
# filterKey = 'train-filter/bryostatin-filter.txt'
# r = trainClient.train('bbbc021', filterBucket, filterKey)
# print(r)

# started 8:15pm
# filterBucket = 'bioimage-search-input'
# filterKey = 'train-filter/camptothecin-filter.txt'
# r = trainClient.train('bbbc021', filterBucket, filterKey)
# print(r)

# 2208 chlorambucil-filter.txt
# 2208 cisplatin-filter.txt
# 2208 colchicine-filter.txt
# 2208 cyclohexamide-filter.txt
# 2208 cytochalasinB-filter.txt
# 2208 cytochalasinD-filter.txt
# 2208 demecolcine-filter.txt
# 2208 docetaxel-filter.txt
# 2208 emetine-filter.txt
# 2208 epothiloneB-filter.txt

# Below, started 8:27pm

# filterBucket = 'bioimage-search-input'
# filterKey = 'train-filter/chlorambucil-filter.txt'
# r = trainClient.train('bbbc021', filterBucket, filterKey)
# print(r)

# filterBucket = 'bioimage-search-input'
# filterKey = 'train-filter/cisplatin-filter.txt'
# r = trainClient.train('bbbc021', filterBucket, filterKey)
# print(r)

# Running ***
# filterBucket = 'bioimage-search-input'
# filterKey = 'train-filter/colchicine-filter.txt'
# r = trainClient.train('bbbc021', filterBucket, filterKey)
# print(r)

# filterBucket = 'bioimage-search-input'
# filterKey = 'train-filter/cyclohexamide-filter.txt'
# r = trainClient.train('bbbc021', filterBucket, filterKey)
# print(r)

# filterBucket = 'bioimage-search-input'
# filterKey = 'train-filter/cytochalasinB-filter.txt'
# r = trainClient.train('bbbc021', filterBucket, filterKey)
# print(r)

# filterBucket = 'bioimage-search-input'
# filterKey = 'train-filter/cytochalasinD-filter.txt'
# r = trainClient.train('bbbc021', filterBucket, filterKey)
# print(r)

# filterBucket = 'bioimage-search-input'
# filterKey = 'train-filter/demecolcine-filter.txt'
# r = trainClient.train('bbbc021', filterBucket, filterKey)
# print(r)

# filterBucket = 'bioimage-search-input'
# filterKey = 'train-filter/docetaxel-filter.txt'
# r = trainClient.train('bbbc021', filterBucket, filterKey)
# print(r)

# Running ***
# filterBucket = 'bioimage-search-input'
# filterKey = 'train-filter/emetine-filter.txt'
# r = trainClient.train('bbbc021', filterBucket, filterKey)
# print(r)

# Initial failure
# filterBucket = 'bioimage-search-input'
# filterKey = 'train-filter/epothiloneB-filter.txt'
# r = trainClient.train('bbbc021', filterBucket, filterKey)
# print(r)

### Final set

# 2208 etoposide-filter.txt
# 2208 floxuridine-filter.txt
# 2208 lactacystin-filter.txt
# 2208 latrunculinB-filter.txt
# 2208 methotrexate-filter.txt
# 2208 mevinolin-lovastatin-filter.txt
# 2208 mitomycinC-filter.txt
# 2208 mitoxantrone-filter.txt
# 2208 nocodazole-filter.txt
# 2208 proteasomeinhibitorI-filter.txt
# 2208 simvastatin-filter.txt
# 32568 taxol-filter.txt
# 2208 vincristine-filter.txt

# Running ***
# filterBucket = 'bioimage-search-input'
# filterKey = 'train-filter/etoposide-filter.txt'
# r = trainClient.train('bbbc021', filterBucket, filterKey)
# print(r)

# Running ***
# filterBucket = 'bioimage-search-input'
# filterKey = 'train-filter/floxuridine-filter.txt'
# r = trainClient.train('bbbc021', filterBucket, filterKey)
# print(r)

# Redo
# filterBucket = 'bioimage-search-input'
# filterKey = 'train-filter/lactacystin-filter.txt'
# r = trainClient.train('bbbc021', filterBucket, filterKey)
# print(r)

# Redo
# filterBucket = 'bioimage-search-input'
# filterKey = 'train-filter/latrunculinB-filter.txt'
# r = trainClient.train('bbbc021', filterBucket, filterKey)
# print(r)

# Running ***
# filterBucket = 'bioimage-search-input'
# filterKey = 'train-filter/methotrexate-filter.txt'
# r = trainClient.train('bbbc021', filterBucket, filterKey)
# print(r)

# Redo
# filterBucket = 'bioimage-search-input'
# filterKey = 'train-filter/mevinolin-lovastatin-filter.txt'
# r = trainClient.train('bbbc021', filterBucket, filterKey)
# print(r)

# Running ***
# filterBucket = 'bioimage-search-input'
# filterKey = 'train-filter/mitomycinC-filter.txt'
# r = trainClient.train('bbbc021', filterBucket, filterKey)
# print(r)

# Running ***
# filterBucket = 'bioimage-search-input'
# filterKey = 'train-filter/mitoxantrone-filter.txt'
# r = trainClient.train('bbbc021', filterBucket, filterKey)
# print(r)

# Redo <<<
# filterBucket = 'bioimage-search-input'
# filterKey = 'train-filter/nocodazole-filter.txt'
# r = trainClient.train('bbbc021', filterBucket, filterKey)
# print(r)

# Redo <<<
# filterBucket = 'bioimage-search-input'
# filterKey = 'train-filter/proteasomeinhibitorI-filter.txt'
# r = trainClient.train('bbbc021', filterBucket, filterKey)
# print(r)

# Redo <<<
# filterBucket = 'bioimage-search-input'
# filterKey = 'train-filter/simvastatin-filter.txt'
# r = trainClient.train('bbbc021', filterBucket, filterKey)
# print(r)

# Running ***
# filterBucket = 'bioimage-search-input'
# filterKey = 'train-filter/taxol-filter.txt'
# r = trainClient.train('bbbc021', filterBucket, filterKey)
# print(r)

# Running ***
# filterBucket = 'bioimage-search-input'
# filterKey = 'train-filter/vincristine-filter.txt'
# r = trainClient.train('bbbc021', filterBucket, filterKey)
# print(r)

#############################################################################################
## bbbc012-128

# r = trainClient.train('bbbc021-128', '', '', 'false')
# print(r)

# To create fresh image processing artifacts before doing filter series
#r = trainClient.train('bbbc021-2')
# r = trainClient.train('bbbc021-2', '', '', 'false')
# print(r)

r = trainClient.train('bbbc021-3', '', '', 'false')
print(r)



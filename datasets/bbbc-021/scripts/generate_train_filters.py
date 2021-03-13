#  BACKGROUND
# 
# This script creates lists of train/label artifacts suitable for training the BBBC021 dataset
#.  https://bbbc.broadinstitute.org/BBBC021
# 
# To demonstrate prediction of mechanisn of action (MOA), a separate training set is created for each compound of known MOA, such
# that the remaining labeled compounds can be used to train a classifier, which in turn can attempt to successfully classify the
# left out compound.
#
# Once the classifier is trained, there are two 'best-matching' methods:
#
#   NSC - not same compound - only considers matches to other compounds
#   NSCB - not same compound or batch - excludes both same compound and batch before best-match
#
# In addition to NSC vs NSCB for matching, there are two different scoring methods:
#
#   Per Treatment - averages embeddings across all wells for a given treatment
#.  Per Well - averages embeddings only within wells
#
# USAGE
#
# This script is run after all bbbc021 plate imagery is loaded into bioimage search.
#
# It requires as input an 'embeddingName' which is used to identify the particular dataset of interest for training, in terms of its image processing 
# and training parameters. Different trainIds within the context of an embedding correspond to different training runs with different partitions of
# training data, but they do not vary in structural parameters for image processing or training.
#
# We first use utilities to get BBBC-021 metadata that identifies the compound and moa for every plate, well, and image.
#
# Our output will consist of a separate image artifact "exclusion" list per compound with a known MOA, corresponding to the compound to be
# left out during the assembly of the training files.
#
# Although the dataset has 113 compounds, only a subset of these have known MOAs and therefore can be used.
# 
# Our general plan is to:
#
#  1 - Load BBBC-021 metadata
#. 2 - Create a map of lists, the keys for which corresponds to each compound with known moa. The list will be a list of objects, each of which will
#.       contain sufficient info to specify the training artifacts, namely, { plateId, imageId } - we also need embeddingName but that is global context.
#  3 - Get the list of plateIds compatible with the specified embedding
#. 4 - Iterate through the list of compatible plateIds
#. 5 - For each plateId, iterate through its member images
#  6 - For each member image, iterate over each moa-compound
#  7 - For each moa-compound, create a list of corresponding imageIds.
#  8 - Once all lists are populated, write the exclusion files locally.
#
###############################################################################################

import sys
import boto3
from pathlib import Path
import bbbc021common as bb

s3c = boto3.client('s3')

sys.path.insert(0, "../../../cli/bioims/src")
import bioims

BBBC021_BUCKET = 'bioimagesearchbbbc021stack-bbbc021bucket544c3e64-10ecnwo51127'
BIOIMS_INPUT_BUCKET = 'bioimage-search-input'
EMBEDDING = "bbbc021-3"

image_df, moa_df = bb.Bbbc021PlateInfoByDF.getDataFrames(BBBC021_BUCKET)
compound_moa_map = bb.Bbbc021PlateInfoByDF.getCompoundMoaMapFromDf(moa_df)

# We need to go from imageId->ImageSourceId->compound->moa
# 'Image_FileName_DAPI[:-4]' serves as the ImageSourceId
sourceCompoundMap={}
for i in range(len(image_df.index)):
    r = image_df.iloc[i]
    imageSourceId = r['Image_FileName_DAPI'][:-4]
    compound = r['Image_Metadata_Compound']
    sourceCompoundMap[imageSourceId]=compound

bbbc021ImageCount = len(image_df.index)
print("BBBC-021 image count={}".format(bbbc021ImageCount))

imagesRemovedByCompound={}
moaDict={}
i=0
for k, v in compound_moa_map.items():
    print("i={} key={} value={}".format(i,k,v))
    moaDict[v]=True
    removedList = []
    imagesRemovedByCompound[k]=removedList
    i+=1
    
imageClient = bioims.client('image-management')
trainingConfigurationClient = bioims.client('training-configuration')

embeddingInfo = trainingConfigurationClient.getEmbeddingInfo(EMBEDDING)

print(embeddingInfo)
width = embeddingInfo['inputWidth']
height = embeddingInfo['inputHeight']
depth = embeddingInfo['inputDepth']
channels = embeddingInfo['inputChannels']

plateList = imageClient.listCompatiblePlates(width, height, depth, channels)

for i, pi in enumerate(plateList):
    plateId = pi['plateId']
    print("Plate {} {}".format(i, plateId))
    imageList = imageClient.getImagesByPlateId(plateId)
    for imageItem in imageList:
        image = imageItem['Item']
        imageId = image['imageId']
        imageSourceId = image['imageSourceId']
        imageCompound = sourceCompoundMap[imageSourceId]
        if 'trainCategory' in image and 'trainLabel' in image:
            trainCategory = image['trainCategory']
            trainLabel = image['trainLabel']
            if trainCategory=='moa' and moaDict[trainLabel]:
                for compound, moa in compound_moa_map.items():
                    if compound==imageCompound:
                        imagesRemovedByCompound[compound].append(imageId)

for compound, imageList in imagesRemovedByCompound.items():
    l = len(imageList)
    print("{} has {} entries".format(compound, l))
    cnws ="".join(compound.split())
    c2 = cnws.replace('/','-')
    trainFile = c2 + "-filter.txt"
    print("Writing {}".format(trainFile))
    f = open(trainFile, "w")
    for imageId in imageList:
        f.write(imageId+'\n')
    f.close()
    trainPath = "train-filter/" + EMBEDDING + "/" + trainFile
    with open(trainFile, 'rb') as fdata:
        s3c.upload_fileobj(fdata, BIOIMS_INPUT_BUCKET, trainPath)
    fnPath=Path(trainFile)
    fnPath.unlink()

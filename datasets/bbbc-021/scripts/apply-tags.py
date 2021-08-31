import sys
import argparse
import boto3
from pathlib import Path
import bbbc021common as bb

s3c = boto3.client('s3')

sys.path.insert(0, "../../../cli/bioims/src")
import bioims

parser = argparse.ArgumentParser()

parser.add_argument('--bbbc021-bucket', type=str, required=True, help='bbbc021 bucket')
parser.add_argument('--bioims-resource-bucket', type=str, required=True, help='resource bucket')
parser.add_argument('--embeddingName', type=str, required=True, help='embedding name')

args = parser.parse_args()

BBBC021_BUCKET = args.bbbc021_bucket
BIOIMS_INPUT_BUCKET = args.bioims_resource_bucket
EMBEDDING = args.embeddingName

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

#imagesRemovedByCompound={}
moaDict={}
i=0
for k, v in compound_moa_map.items():
    print("i={} key={} value={}".format(i,k,v))
    moaDict[v]=True
#    removedList = []
#    imagesRemovedByCompound[k]=removedList
    i+=1
    
imageClient = bioims.client('image-management')
trainingConfigurationClient = bioims.client('training-configuration')
tagClient = bioims.client('tag')

embeddingInfo = trainingConfigurationClient.getEmbeddingInfo(EMBEDDING)
print(embeddingInfo)
width = embeddingInfo['inputWidth']
height = embeddingInfo['inputHeight']
depth = embeddingInfo['inputDepth']
channels = embeddingInfo['inputChannels']

print("list compatible plates: width={} height={} depth={} channels={}".format(width, height, depth, channels))
plateList = imageClient.listCompatiblePlates(width, height, depth, channels)
pl=len(plateList)
print("found {} compatible plates".format(pl))

tagList = tagClient.getAllTags()
tagIdMap={}
for tagInfo in tagList:
    print("{} {}".format(tagInfo['id'], tagInfo['tagValue']))
    tagIdMap[tagInfo['tagValue']] = tagInfo['id']
    
def cleanLabel(label):
    c1 = "".join(label.split())
    c2 = c1.replace('/','-')
    return c2
    
def getBatchTagFromPlateSourceId(psi):
    ca = psi.split('_')
    return "batch:" + ca[0]

for i, pi in enumerate(plateList):
    plateId = pi['plateId']
    print("Plate {} {}".format(i, plateId))
    imageList = imageClient.getImagesByPlateId(plateId)
    for imageItem in imageList:
        image = imageItem['Item']
        imageId = image['imageId']
        imageSourceId = image['imageSourceId']
        tagList = []
        if 'plateSourceId' in image:
            plateSourceId = image['plateSourceId']
            batchTag = getBatchTagFromPlateSourceId(plateSourceId)
            batchTagId = tagIdMap[batchTag]
            tagList.append(batchTagId)
        if imageSourceId in sourceCompoundMap:
            imageCompound = cleanLabel(sourceCompoundMap[imageSourceId])
            compoundTag = "compound:" + imageCompound
            if compoundTag in tagIdMap:
                compoundId = tagIdMap[compoundTag]
                print("{} {} {}".format(imageId, compoundTag, compoundId))
                tagList.append(compoundId)
                if 'trainCategory' in image and 'trainLabel' in image:
                    trainCategory = image['trainCategory']
                    trainLabel = image['trainLabel']
                    if trainCategory=='moa' and trainLabel in moaDict:
                        moa = cleanLabel(trainLabel)
                        moaTag = "moa:" + moa
                        moaId = tagIdMap[moaTag]
                        print("{} {} {}".format(imageId, moaTag, moaId))
                        tagList.append(moaId)
        if len(tagList)>0:
            imageClient.updateImageTags(imageId, tagList)

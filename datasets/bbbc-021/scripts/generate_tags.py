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
batchDict={}
for i in range(len(image_df.index)):
    r = image_df.iloc[i]
    imageSourceId = r['Image_FileName_DAPI'][:-4]
    compound = r['Image_Metadata_Compound']
    batch_plate = r['Image_Metadata_Plate_DAPI']
    bpa = batch_plate.split('_')
    batchDict[bpa[0]]=True
    sourceCompoundMap[imageSourceId]=compound
    
batchArr=[]
for k, v in batchDict.items():
    batchArr.append(k)
batchArr.sort()

compoundDict={}
compoundArr=[]
moaDict={}
moaArr=[]
for k, v in compound_moa_map.items():
    vnws = "".join(v.split())
    v2 = vnws.replace('/','-')
    if v2 not in moaDict:
        moaArr.append(v2)
        moaDict[v2]=True
    knws = "".join(k.split())
    k2 = knws.replace('/','-')
    if k2 not in compoundDict:
        compoundArr.append(k2)
        compoundDict[k2]=True
    
moaArr.sort()
compoundArr.sort()

tagClient = bioims.client('tag');

i=0
for moa in moaArr:
    print("{} {}".format(i,moa))
    tag = "moa:"+moa
    tagClient.createTag(tag)
    i+=1
    
print("\n")    

i=0
for compound in compoundArr:
    print("{} {}".format(i,compound))
    tag = "compound:"+compound
    tagClient.createTag(tag)
    i+=1
    
i=0
for batch in batchArr:
    print("{} {}".format(i, batch))
    tag = "batch:"+batch
    tagClient.createTag(tag)
    i+=1
    

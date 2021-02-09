import sys
import boto3
from pathlib import Path
import bbbc021common as bb

s3c = boto3.client('s3')

sys.path.insert(0, "../../../cli/bioims/src")
import bioims

BBBC021_BUCKET = 'bioimagesearchbbbc021stack-bbbc021bucket544c3e64-10ecnwo51127'
BIOIMS_INPUT_BUCKET = 'bioimage-search-input'
EMBEDDING = "bbbc021"

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

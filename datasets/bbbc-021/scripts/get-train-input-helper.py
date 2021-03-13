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

def labelFromCompound(compound):
    cnws ="".join(compound.split())
    return cnws.replace('/','-')

compoundLabelList=[]
i=0
for k, v in compound_moa_map.items():
    if k != 'DMSO':
        compoundLabelList.append(labelFromCompound(k))
    i+=1
    
compoundLabelList.sort()
i=0    
for label in compoundLabelList:
    filterKey = "train-filter/" + EMBEDDING + "/" + label + "-filter.txt"
    print("{} {} {}".format(EMBEDDING, BIOIMS_INPUT_BUCKET, filterKey))

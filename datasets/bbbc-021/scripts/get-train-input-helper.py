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

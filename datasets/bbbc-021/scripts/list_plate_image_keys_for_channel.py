import sys
import boto3
import pandas as pd
import argparse

parser = argparse.ArgumentParser()

parser.add_argument('--bucket', type=str, help='bucket with BBBC-021 data')
parser.add_argument('--channel', type=str, choices=['dapi', 'tubulin', 'actin'], help='must be dapi, tubulin, or actin')
parser.add_argument('--plate', type=str, help='plate label, e.g., Week_2241')

args = parser.parse_args()

imageMetadataKey='BBBC021_v1_image.csv'

s3c = boto3.client('s3')

def getCsvDfFromS3(bucket, key):
    csvObject = s3c.get_object(Bucket=bucket, Key=key)
    file_stream = csvObject['Body']
    df = pd.read_csv(file_stream)
    return df

image_df = getCsvDfFromS3(args.bucket, imageMetadataKey)

fileDict={}

labelKeyDict={}
labelKeyDict['dapi']='Image_FileName_DAPI'
labelKeyDict['tubulin']='Image_FileName_Tubulin'
labelKeyDict['actin']='Image_FileName_Actin'

labelKey=labelKeyDict[args.channel]

for r1 in range(len(image_df.index)):
    row1=image_df.iloc[r1]
    fileDict[row1[labelKey]]=1
    
response = s3c.list_objects_v2(
    Bucket=args.bucket,
    Prefix=args.plate,
    MaxKeys=1000
)

keys=[]

for obj in response['Contents']:
    k1=obj['Key']
    k2=k1.split('/')[1]
    if k2 in fileDict:
        keys.append(k1)
        
for key in keys:
    print(args.bucket,' ', key)
    
        
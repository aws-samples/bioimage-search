import sys
import boto3
import pandas as pd
import argparse
import json

"""
Example mainfest (output):

{
    images: [
        {
            outputBucket: xxx,
            outputKey: xxx,
            flatFieldBucket: xxx,
            flatFieldKey: xxx,
            channelBucket: xxx,
            nuclearChannelKey: xxx,
            additionalChannels: [
                xxx,
                xxx,
                ...
            ]
        },
        {
        ...
        }
    ]
}
"""

parser = argparse.ArgumentParser()

parser.add_argument('--bucket', type=str, help='bucket with BBBC-021 data')
parser.add_argument('--plate', type=str, help='plate label, e.g., Week_2241')
parser.add_argument('--flatFieldBucket', type=str, help='flat field bucket')
parser.add_argument('--flatFieldKey', type=str, help='flat field key')
parser.add_argument('--outputBucket', type=str, help='output bucket for ROI numpy output')
parser.add_argument('--outputKeyPrefix', type=str, help='output key prefix for ROI numpy output')

args = parser.parse_args()

imageMetadataKey='BBBC021_v1_image.csv'

s3c = boto3.client('s3')

def getCsvDfFromS3(bucket, key):
    csvObject = s3c.get_object(Bucket=bucket, Key=key)
    file_stream = csvObject['Body']
    df = pd.read_csv(file_stream)
    return df

image_df = getCsvDfFromS3(args.bucket, imageMetadataKey)

dapiFiles=[]
tubulinFileDict={}
actinFileDict={}

platePrefix = args.plate

weekPrefix = platePrefix.split('_')[0]
imagePathnameDapi = weekPrefix + '/' + platePrefix

plate_df = image_df.loc[image_df['Image_PathName_DAPI']==imagePathnameDapi]

for p in range(len(plate_df.index)):
    r = plate_df.iloc[p]
    dapiFile=r['Image_FileName_DAPI']
    dapiFiles.append(platePrefix + '/' + dapiFile)
    tubulinFileDict[dapiFile]=platePrefix + '/' + r['Image_FileName_Tubulin']
    actinFileDict[dapiFile]=platePrefix + '/' + r['Image_FileName_Actin']
    
manifestDict = {}

images = []

for dapiFile in dapiFiles:
    dapiPrefix = dapiFile[(len(platePrefix)+1):]
    imageDict = {}
    imageDict["outputBucket"]=args.outputBucket
    imageDict["outputRoiDataKey"]=args.outputKeyPrefix + '/' + dapiFile[:-4] + '_roi.npy'
    imageDict["outputRoiCoordinateKey"]=args.outputKeyPrefix + '/' + dapiFile[:-4] + '_roi.coord'
    imageDict["flatFieldBucket"]=args.flatFieldBucket
    imageDict["flatFieldkey"]=args.flatFieldKey
    imageDict["channelBucket"]=args.bucket
    imageDict["nuclearChannelKey"]=dapiFile
    additionalChannels = []
    additionalChannels.append(tubulinFileDict[dapiPrefix])
    additionalChannels.append(actinFileDict[dapiPrefix])
    imageDict["additionalChannels"] = additionalChannels
    images.append(imageDict)
    
manifestDict["images"] = images

manifestJsonString = json.dumps(manifestDict, sort_keys=True, indent=4, separators=(',', ': '))

print(manifestJsonString)

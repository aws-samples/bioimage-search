import sys
import boto3
import pandas as pd
import argparse
import json

"""
For consistency, this script assumes the following S3 object layout for the BBBC-021 dataset:

BBBC-021 raw imagery:

    <bbbc-021 bucket>/<Plate, e.g., Week10_40111>/<tif images>

Flat Field compute:

    <test bucket>/FlatField/<Plate>-<channel>-flatfield.tif
    
ROI compute:

    <test bucket>/ROI/<Plate>/<raw DAPI tif prefix>-roi.npy (contains normalized multichannel ROI data ready for training)
    <test bucket>/ROI/<Plate>/<raw DAPI tif prefix>-roi.json (contains list of ROI coordinates wrt raw image, ordered wrt the npy file)

With this in mind, for a given Plate prefix, it generates the following manifest for use with the image-preprocessing service:

{
    images: [
        {
            outputBucket: xxx,
            outputKeyPrefix: xxx,
            inputFlatfieldBucket: xxx,
            inputChannelBucket: xxx,
            segmentationChannelName: xxx,
            inputChannels: [
                {
                    name: xxx,
                    imageKey: xxx,
                    flatfieldKey: xxx
                }
            ]
        }
    ]
}
"""

parser = argparse.ArgumentParser()

parser.add_argument('--bbbc021Bucket', type=str, help='bucket with BBBC-021 data')
parser.add_argument('--testBucket', type-str, help='test bucket')
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

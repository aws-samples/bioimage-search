import sys
import boto3
import pandas as pd
import argparse
import json
import bbbc021common as bb

"""
For consistency, this script assumes the following S3 object layout for the BBBC-021 dataset:

BBBC-021 raw imagery:

    <bbbc-021 bucket>/<Plate, e.g., Week10_40111>/<tif images>

Flat Field compute:

    <test bucket>/FlatField/<Plate>-<channel>-flatfield.tif
    
ROI compute:

    <output bucket>/ROI/<Plate>/<raw DAPI tif prefix>-roi.npy (contains normalized multichannel ROI data ready for training)
    <output bucket>/ROI/<Plate>/<raw DAPI tif prefix>-roi.json (contains list of ROI coordinates wrt raw image, ordered wrt the npy file)

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
                    flatFieldKey: xxx
                }
            ]
        }
    ]
}
"""

parser = argparse.ArgumentParser()

parser.add_argument('--bbbc021Bucket', type=str, help='bucket with BBBC-021 data')
parser.add_argument('--outputBucket', type=str, help='output bucket')
parser.add_argument('--plate', type=str, help='plate label, e.g., Week_2241')

args = parser.parse_args()

plateName = args.plate

bb1 = bb.Bbbc021PlateInfo(args.bbbc021Bucket, plateName)
dapiFiles = bb1.getDapiFileList()

manifestDict = {}
images = []

for dapiFile in dapiFiles:
    tubulinFile = bb1.getTubulinFileByDapi(dapiFile)
    actinFile = bb1.getActinFileByDapi(dapiFile)
    imageDict = {}
    dapiFileName = dapiFile[(len(plateName)+1):]
    dapiFilePrefix = dapiFileName[:-4]
    imageDict["outputBucket"]=args.outputBucket
    imageDict["outputKeyPrefix"] = 'ROI/' + plateName + '/' + dapiFilePrefix + '-roi'
    imageDict["inputFlatfieldBucket"] = args.outputBucket
    imageDict["inputChannelBucket"] = args.bbbc021Bucket
    imageDict["segmentationChannelName"] = 'dapi'
    inputChannels = []

    dapiDict = {}
    dapiDict['name'] = 'dapi'
    dapiDict['imageKey'] = dapiFile
    dapiDict['flatFieldKey'] = 'FlatField/' + plateName + '-dapi-flatfield.npy'
    inputChannels.append(dapiDict)
    
    tubulinDict = {}
    tubulinDict['name'] = 'tubulin'
    tubulinDict['imageKey'] = tubulinFile
    tubulinDict['flatFieldKey'] = 'FlatField/' + plateName + '-tubulin-flatfield.npy'
    inputChannels.append(tubulinDict)
    
    actinDict = {}
    actinDict['name'] = 'actin'
    actinDict['imageKey'] = actinFile
    actinDict['flatFieldKey'] = 'FlatField/' + plateName + '-actin-flatfield.npy'
    inputChannels.append(actinDict)    

    imageDict["inputChannels"] = inputChannels
    images.append(imageDict)
    
manifestDict["images"] = images

manifestJsonString = json.dumps(manifestDict, sort_keys=True, indent=4, separators=(',', ': '))

print(manifestJsonString)

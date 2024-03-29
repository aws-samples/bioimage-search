import sys
import boto3
import pandas as pd
import argparse
import json
import bbbc021common as bb

"""

This is the json format for SourcePlateInfo:

  SourcePlateInfo {
     plateSourceId: <string>
     images: [
       wellSourceId: <string>
       imageSourceId: <string>
       sourceBucket: <string>a
       sourceKey: <string>
       channelKeys: [{ channel:<name>, keysuffix:<suffix> }]
       category: <string - optional>
       label: <string - optional>
       experiment: <string - optional>
     ]
   }

"""

parser = argparse.ArgumentParser()

parser.add_argument('--bbbc021Bucket', type=str, help='bucket with BBBC-021 data')
parser.add_argument('--plate', type=str, help='plate label, e.g., Week1_22141')

args = parser.parse_args()

plateName = args.plate

bb1 = bb.Bbbc021PlateInfo(args.bbbc021Bucket, plateName)
dapiFiles = bb1.getDapiFileList()

sourcePlateInfo = {}
sourcePlateInfo['plateSourceId'] = plateName

images = []

def getFileName(filepath):
    return filepath[(len(plateName)+1):]
    
def getFilePrefix(filepath):
    return filepath[(len(plateName)+1):-4]

for dapiFile in dapiFiles:
    tubulinFile = bb1.getTubulinFileByDapi(dapiFile)
    actinFile = bb1.getActinFileByDapi(dapiFile)
    
    channelKeys = []
    channelKeys.append({ "name" : "dapi",    "keysuffix" : dapiFile})
    channelKeys.append({ "name" : "tubulin", "keysuffix" : tubulinFile})
    channelKeys.append({ "name" : "actin", "keysuffix" : actinFile})
    
    imageElement = {}
    imageElement['wellSourceId'] = bb1.getWellByDapi(dapiFile)
    imageElement['imageSourceId'] = getFilePrefix(dapiFile)
    imageElement['sourceBucket'] = args.bbbc021Bucket
    imageElement['sourceKey'] = ''
    imageElement['channelKeys'] = channelKeys
    imageElement['category'] = 'moa'
    imageElement['subclassType'] = 'compound'
    if (bb1.getMoaByDapi(dapiFile)):
        imageElement['label'] = bb1.getMoaByDapi(dapiFile)
    imageElement['subclass'] = bb1.getCompoundByDapi(dapiFile)
    imageElement['experiment'] = 'BBBC021_v1'
    
    images.append(imageElement)

sourcePlateInfo['images'] = images

sourcePlateInfoStr = json.dumps(sourcePlateInfo, sort_keys=True, indent=4, separators=(',', ': '))

print(sourcePlateInfoStr)

import os
from io import StringIO, BytesIO
import boto3
from PIL import Image
import sys

import bioimageimage as bi

"""

It inspects the image (including all channel files, if separate) and returns the dimensions.

Example input event:

event= {'Item': {'trainCategory': 'moa', 'imageId': 'rEhXPhQ141NMoyUk6GQpc5', 'plateId': '3YpbgZCfkNLfZHDTZU3E2x', 'trainId': 'origin', 'plateSourceId': 'Week1_22123', 'bucket': 'bioimagesearchbbbc021stack-bbbc021bucket544c3e64-10ecnwo51127', 'experiment': 'BBBC021_v1', 'channelKeys': [{'name': 'dapi', 'keysuffix': 'Week1_22123/Week1_150607_D10_s3_w172448BEF-3248-4414-81F8-062AD4A8A945.tif'}, {'name': 'tubulin', 'keysuffix': 'Week1_22123/Week1_150607_D10_s3_w26491D8F9-CF81-4D24-A7FB-7F2DDCC84044.tif'}, {'name': 'actin', 'keysuffix': 'Week1_22123/Week1_150607_D10_s3_w4EB8A365E-DF1E-49E9-8E14-9F11B5665718.tif'}], 'wellId': 'hrQh9M7BLLu2odRM2uYWYy', 'imageSourceId': 'Week1_150607_D10_s3_w172448BEF-3248-4414-81F8-062AD4A8A945', 'messageId': 'c30b9ed2-330f-484e-a828-a74e9bce3480', 'wellSourceId': 'D10', 'trainLabel': 'Microtubule stabilizers', 'key': '', 'createTimestamp': '1604622079504'}}

"""

s3c = boto3.client('s3')

def handler(event, context):
    s3c = boto3.client('s3')
    print("event=", event)    

    # image_ids = event['image_ids']
    # for image_id in image_ids:
    #     print("imageId=", image_id)

    return {
        'key0' : 'value0'
    }  
    
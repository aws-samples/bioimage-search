import os
from io import StringIO, BytesIO
import boto3
from PIL import Image
import sys

import bioimageimage as bi

"""

It inspects the image (including all channel files, if separate) and updates the image table with corresponding information.

Example input event:

event= {'trainId': 'origin', 'plateId': '3YpbgZCfkNLfZHDTZU3E2x', 'imageId': 'p1iBF8Vfg5M7GnRAknDFqn'}

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
    
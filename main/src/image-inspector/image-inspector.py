import os
from io import StringIO, BytesIO
import boto3
from PIL import Image
import sys

import bioimageimage as bi

"""

This function takes as input a list of image IDs.

It inspects each image (including all channel files, if separate) and updates the image table with corresponding information.

"""

s3c = boto3.client('s3')

def handler(event, context):
    s3c = boto3.client('s3')
    image_ids = event['image_ids']
    for image_id in image_ids:
        print("imageId=", image_id)

    return { 
        'key0' : 'value0'
    }  
    
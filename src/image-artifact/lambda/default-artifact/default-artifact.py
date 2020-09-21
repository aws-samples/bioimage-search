import boto3
from PIL import Image
import numpy as np
from skimage.exposure import histogram

def handler(event, context):
    s3c = boto3.client('s3')
    input_bucket = event['input_bucket']
    input_key = event['input_key']
    print("input_bucket=", input_bucket, " input_key=", input_key)
    fileObject = s3c.get_object(Bucket=input_bucket, Key=input_key)
    file_stream = fileObject['Body']
    im = Image.open(file_stream)
    pix = np.array(im)
    pix_shape = pix.shape
    return { 
        'input_bucket' : event['input_bucket'],
        'input_key' : event['input_key'],
        'input_shape' : pix_shape,
        'output_bucket' : event['output_bucket'],
        'output_key' : event['output_key']
    }  
    
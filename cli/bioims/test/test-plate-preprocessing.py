import os
import subprocess
import sys
import json
import boto3
sys.path.insert(0, "../src")
import bioims
import shortuuid
import argparse

s3c = boto3.client('s3')

parser = argparse.ArgumentParser()
parser.add_argument('--plate', type=str, help='bbbc-021 test plate')
args = parser.parse_args()

PYTHON = 'python3.8'
PROJECT_TOP_DIR = '/home/ec2-user/environment/bioimage-search'
BBBC_021_BUCKET = 'bioimagesearchbbbc021stack-bbbc021bucket544c3e64-10ecnwo51127'
TEST_BUCKET = 'bioimagesearchbasestack-bioimagesearchtestbucket3-djdwcbvul5zb'

testId = shortuuid.uuid()
testPlateName = args.plate
platePreprocessingClient = bioims.client('plate-preprocessing')

testDir = '/home/ec2-user/tmp/' + testId
os.system('mkdir -p ' + testDir)
generateImageListScript = PROJECT_TOP_DIR + '/datasets/bbbc-021/scripts/list_plate_image_keys_for_channel.py'
channelList = [ 'dapi', 'tubulin', 'actin']

for channel in channelList:
    imageFilePrefix = testPlateName + '-' + channel + '-flatfield'
    imageListFilename =  imageFilePrefix + '.txt'
    imageListLocalFile = testDir + '/' + imageListFilename
    cmdList = []
    cmdList.append(PYTHON)
    cmdList.append(generateImageListScript)
    cmdList.append('--bucket')
    cmdList.append(BBBC_021_BUCKET)
    cmdList.append('--channel')
    cmdList.append(channel)
    cmdList.append('--plate')
    cmdList.append(testPlateName)
    # Ignore Cloud9 warning for text=True
    cmd = subprocess.Popen(cmdList, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    output, errors = cmd.communicate()
    cmd.wait()
    f = open(imageListLocalFile, "w")
    f.write(output)
    f.close()
    testImageListKey = 'tmp/' + testId + '/' + imageListFilename
    with open(imageListLocalFile, 'rb') as fdata:
        s3c.upload_fileobj(fdata, TEST_BUCKET, testImageListKey)
    print("Uploaded Bucket=", TEST_BUCKET, " Key=", testImageListKey)
    flatFieldKey = 'FlatField/' + imageFilePrefix + '.tif'
    platePreprocessingClient.preprocessPlate(TEST_BUCKET, testImageListKey, TEST_BUCKET, flatFieldKey, platePreprocessingClient.getBatchOnDemandQueueName())
    print("Computing Flat-Field Image Bucket=", TEST_BUCKET, " Key=", flatFieldKey)
        
os.system('rm -r ' + testDir)

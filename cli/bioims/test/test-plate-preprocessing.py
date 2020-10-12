import os
import subprocess
import sys
import json
import boto3
sys.path.insert(0, "../src")
import bioims
import shortuuid

s3c = boto3.client('s3')

PYTHON = 'python3.8'
PROJECT_TOP_DIR = '/home/ec2-user/environment/bioimage-search'
BBBC_021_BUCKET = 'bioimagesearchbbbc021stack-bbbc021bucket544c3e64-10ecnwo51127'
TEST_BUCKET = 'bioimagesearchbasestack-bioimagesearchtestbucket3-djdwcbvul5zb'

testId = shortuuid.uuid()

platePreprocessingClient = bioims.client('plate-preprocessing')
testPlateName = 'Week10_40111'
testDir = '/home/ec2-user/tmp/' + testId
os.system('mkdir -p ' + testDir)
generateImageListScript = PROJECT_TOP_DIR + '/datasets/bbbc-021/scripts/list_plate_image_keys_for_channel.py'
channelList = [ 'dapi', 'tubulin', 'actin']

for channel in channelList:
    imageFilename = testPlateName + '_image-list-' + channel + '.txt'
    imageListLocalFile = testDir + '/' + imageFilename
    cmdList = []
    cmdList.append(PYTHON)
    cmdList.append(generateImageListScript)
    cmdList.append('--bucket')
    cmdList.append(BBBC_021_BUCKET)
    cmdList.append('--channel')
    cmdList.append(channel)
    cmdList.append('--plate')
    cmdList.append(testPlateName)
    cmd = subprocess.Popen(cmdList, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    output, errors = cmd.communicate()
    cmd.wait()
    f = open(imageListLocalFile, "w")
    f.write(output)
    f.close()
    testKey = 'Plate_Preprocessing/' + testId + '/' + imageFilename
    with open(imageListLocalFile, 'rb') as fdata:
        s3c.upload_fileobj(fdata, TEST_BUCKET, testKey)
    print("Uploaded Bucket=", TEST_BUCKET, " Key=", testKey)
        
os.system('rm -r ' + testDir)



    
    



import boto3
import sys

fsx = boto3.client('fsx')

fileSystems = fsx.describe_file_systems()
fsList = fileSystems['FileSystems']

fileSystem=None
for fs in fsList:
    tags = fs['Tags']
    for tag in tags:
        key=tag['Key']
        value=tag['Value']
        if value.startswith('BioimageSearch'):
            fileSystem=fs
            break
        
if fileSystem==None:
    print("0")
else:
    print(fileSystem['FileSystemId'])

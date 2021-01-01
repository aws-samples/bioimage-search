import boto3

client = boto3.client('fsx')

fileSystems = client.describe_file_systems()
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
    print("Could not find FSxL filesystem")
else:
    print(fileSystem['FileSystemId'])

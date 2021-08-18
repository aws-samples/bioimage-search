#!/usr/bin/env bash

# Usage: cat plate_list.txt | xargs -n 1 -P 4 ./upload_source_plate.sh
# Note: -P can be increased, but Lambda limits should be monitored.

# These should be filled-in for each deployment:
bbbc021Bucket=bioimagesearchbbbc021stack-bbbc021bucket544c3e64-10ecnwo51127
resourceBucket=bioimage-search-input

mkdir -p ~/tmp
echo Processing $1
uuid=$(uuidgen)
jfile=$uuid-$1.json
python generate_source_plate_info.py --plate $1 --bbbc021Bucket $bbbc021Bucket > ~/tmp/$jfile
aws s3 cp ~/tmp/$jfile s3://$resourceBucket
sleep 1
python upload_client.py --inputBucket $resourceBucket --inputKey $jfile
sfnStatus=$?
sleep 1
aws s3 rm s3://$resourceBucket/$jfile
rm ~/tmp/$jfile
if [ $sfnStatus -eq 0 ]
then
  exit 0
else
  exit 255
fi

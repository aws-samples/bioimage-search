#!/usr/bin/env bash

# Usage: cat plate_list.txt | xargs -n 2 -P 5 ./upload_source_plate.sh
# Note: -P can be increased, but Lambda limits should be monitored.

echo Processing $1
uuid=$(uuidgen)
jfile=$uuid-$1.json
python generate_source_plate_info.py --plate $1 --bbbc021Bucket bioimagesearchbbbc021stack-bbbc021bucket544c3e64-10ecnwo51127 > ~/tmp/$jfile
input_bucket="bioimage-search-input"
aws s3 cp ~/tmp/$jfile s3://$input_bucket
sleep 1
python upload_client.py --inputBucket $input_bucket --inputKey $jfile
sfnStatus=$?
sleep 1
aws s3 rm s3://$input_bucket/$jfile
rm ~/tmp/$jfile
if [ $sfnStatus -eq 0 ]
then
  exit 0
else
  exit 255
fi

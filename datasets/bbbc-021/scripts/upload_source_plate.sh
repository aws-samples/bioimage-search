#!/usr/bin/env bash

# Usage: cat plate_list.txt | xargs -n 1 -P 5 ./upload_source_plate.sh

echo Processing $1
uuid=$(uuidgen)
jfile=$uuid-$1.json
python generate_source_plate_info.py --plate $1 --bbbc021Bucket bioimagesearchbbbc021stack-bbbc021bucket544c3e64-10ecnwo51127 > ~/tmp/$jfile
input_bucket="bioimage-search-input"
aws s3 cp ~/tmp/$jfile s3://$input_bucket
sleep 3
python upload_client.py --inputBucket $input_bucket --inputKey $jfile
sleep 3
aws s3 rm s3://$input_bucket/$jfile
rm ~/tmp/$jfile

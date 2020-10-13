import sys
import boto3
import pandas as pd
import argparse
import bbbc021common as bb

parser = argparse.ArgumentParser()

parser.add_argument('--bucket', type=str, help='bucket with BBBC-021 data')
parser.add_argument('--channel', type=str, choices=['dapi', 'tubulin', 'actin'], help='must be dapi, tubulin, or actin')
parser.add_argument('--plate', type=str, help='plate label, e.g., Week_2241')

args = parser.parse_args()

bb1 = bb.Bbbc021PlateInfo(args.bucket, args.plate)

dapiFiles = bb1.getDapiFileList()

for d in dapiFiles:
    if args.channel == 'dapi':
        print(args.bucket, ' ', d)
    elif args.channel == 'tubulin':
        print(args.bucket, ' ', bb1.getTubulinFileByDapi(d))
    elif args.channel == 'actin':
        print(args.bucket, ' ', bb1.getActinFileByDapi(d))

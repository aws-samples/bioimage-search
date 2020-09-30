import sys
import json
import boto3
sys.path.insert(0, "../src")
import bioims

imageArtifactClient = bioims.client('image-artifact')

#{
#  "input_bucket": "bioimagesearchbbbc021stack-bbbc021bucket544c3e64-1t2bv8cktyrtq",
#  "input_keys": [
#    "Week10_40111/Week10_200907_B02_s1_w18E215662-2CF7-4739-93F3-DBD0C40B78DB.tif",
#    "Week10_40111/Week10_200907_B02_s1_w2D492FCE4-15C2-4C66-99A5-E2235A93A3CC.tif",
#    "Week10_40111/Week10_200907_B02_s1_w436D0A3BC-098D-4271-B5AA-361CA0A7DC88.tif"
#  ],
#  "output_bucket": "bioimage-search-output",
#  "medium_artifact_key": "test-medium.png",
#  "thumbnail_artifact_key": "test-thumbnail.png"
#}

input_key_list = [                                                                                                                                                                                                     "Week10_40111/Week10_200907_B02_s1_w18E215662-2CF7-4739-93F3-DBD0C40B78DB.tif",                                                                                                                                
    "Week10_40111/Week10_200907_B02_s1_w2D492FCE4-15C2-4C66-99A5-E2235A93A3CC.tif",                                                                                                                                
    "Week10_40111/Week10_200907_B02_s1_w436D0A3BC-098D-4271-B5AA-361CA0A7DC88.tif"                                                                                                                                 
  ]

artifact_keys = [ "test-medium.png", "test-thumbnail.png" ]

artifact_sizes = [ 1000, 200 ]

r = imageArtifactClient.generateDefaultArtifacts("bioimagesearchbbbc021stack-bbbc021bucket544c3e64-1t2bv8cktyrtq", input_key_list, "bioimage-search-output", artifact_keys, artifact_sizes)
print(r)


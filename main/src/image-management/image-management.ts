const AWS = require("aws-sdk");
const db = new AWS.DynamoDB.DocumentClient();
const dy = require("bioimage-dynamo");
const TABLE_NAME = process.env.TABLE_NAME || "";
const PARTITION_KEY_IMGID = process.env.PARTITION_KEY || "";
const SORT_KEY_TRNID = process.env.SORT_KEY || "";
const LATEST = "LATEST";
const DDB_MAX_BATCH = 25;
const ORIGIN = "origin";

const PLATE_ID_ATTRIBUTE = "plateId";
const WELL_ID_ATTRIBUTE = "wellId";
const PLATE_SOURCE_ID_ATTRIBUTE = "plateSourceId";
const WELL_SOURCE_ID_ATTRIBUTE = "wellSourceId";
const IMAGE_SOURCE_ID_ATTRIBUTE = "imageSourceId";
const CREATE_TIMESTAMP_ATTRIBUTE = "createTimestamp";
const SEARCH_READY_ATTRIBUTE = "searchReady";
const MESSAGE_ID_ATTRIBUTE = "messageId";
const TRAIN_CATEGORY_ATTRIBUTE = "trainCategory";
const TRAIN_LABEL_ATTRIBUTE = "trainLabel";
const EXPERIMENT_ATTRIBUTE = "experiment";
const EMBEDDING_ATTRIBUTE = "embedding";
const HEIGHT_ATTRIBUTE = "height";
const WIDTH_ATTRIBUTE = "width";
const DEPTH_ATTRIBUTE = "depth";
const CHANNELS_ATTRIBUTE = "channels";
const BUCKET_ATTRIBUTE = "bucket";
const KEY_ATTRIBUTE = "key";
const TAG_ARRAY_ATTRIBUTE = "tagArr";
const ROI_ARRAY_ATTRIBUTE = "roiArr";
const ROI_EMBEDDING_ARRAY_ATTRIBUTE = "roiEmbeddingArr";

/*

  SourcePlateInfo {
    trainId: <string>
    plateSourceId: <string>
    images: [
      wellSourceId: <string>
      imageSourceId: <string>
      category: <string - optional>
      label: <string - optional>
    ]
  }
  
  PlateManifest {
    plateId: <string>
    bucket: <string>
    images: [
      imageId: <string>
      imageSourceId: <string>
      wellSourceId: <string>
      plateSourceId: <string>
      key: <string>
    ]
  }

  createPlateManifest(bucket, key): // input is of type 'SourcePlateInfo', output is 'PlateManifest'
  {
    method: 'createPlateManifest',
    inputBucket: inputBucket,
    inputKey: inputKey,
    outputBucket: outputBucket,
    outputKey: outputKey
  }
  
*/

/////////////////////////////////////////////////

function createManifest(inputBucket: any, inputKey: any, outputBucket: any, outputKey: any) {
  // placeholder  
  return {}
}

/////////////////////////////////////////////////

export const handler = async (event: any = {}): Promise<any> => {
  if (!event.method) {
    console.log("Error: method parameter required - returning status code 400");
    return { statusCode: 400, body: `Error: method parameter required` };
  }

  if (event.method === "createManifest") {
    if (event.inputBucket &&
    event.inputKey &&
    event.outputBucket &&
    event.outputKey) {
      return createManifest(event.inputBucket, event.inputKey, event.outputBucket, event.outputKey);
    } else {
      return {
        statusCode: 400,
        body: `Error: embedding required`,
      };
    }
  }

};
const AWS = require("aws-sdk");
const db = new AWS.DynamoDB.DocumentClient();
const dy = require("bioimage-dynamo")
const TABLE_NAME = process.env.TABLE_NAME || "";
const PARTITION_KEY = process.env.PARTITION_KEY || "";
const LATEST = "LATEST";
const DDB_MAX_BATCH = 25;

const PLATE_PROCESSING_ARN_ATTRIBUTE = "plate-method-arn";
const WELL_PROCESSING_ARN_ATTRIBUTE = "well-method-arn";
const IMAGE_PROCESSING_ARN_ATTRIBUTE = "image-method-arn";
const IMAGE_POST_PROCESSING_ARN_ATTRIBUTE = "image-post-method-arn";
const MODEL_TRAINING_SCRIPT_BUCKET_ATTRIBUTE = "model-training-script-bucket";
const MODEL_TRAINING_SCRIPT_KEY_ATTRIBUTE = "model-training-script-key";
const TRAINING_HYPERPARAMETERS_ATTRIBUTE = "training-hyperparameters";
const INPUT_HEIGHT_ATTRIBUTE = "input-height";
const INPUT_WIDTH_ATTRIBUTE = "input-width";
const INPUT_DEPTH_ATTRIBUTE = "input-depth";
const INPUT_CHANNELS_ATTRIBUTE = "input-channels";
const ROI_HEIGHT_ATTRIBUTE = "roi-height";
const ROI_WIDTH_ATTRIBUTE = "roi-width";
const ROI_DEPTH_ATTRIBUTE = "roi-depth";
const EMBEDDING_VECTOR_LENGTH_ATTRIBUTE = "embedding-vector-length";
const COMMENTS_ATTRIBUTE = "comments";


export const handler = async (event: any = {}): Promise<any> => {
  console.log("Test1")
  return { statusCode: 200, body: `Success` };
};

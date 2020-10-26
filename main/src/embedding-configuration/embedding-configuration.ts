const AWS = require("aws-sdk");
const db = new AWS.DynamoDB.DocumentClient();
const dy = require("bioimage-dynamo");
const TABLE_NAME = process.env.TABLE_NAME || "";
const PARTITION_KEY = process.env.PARTITION_KEY || "";
const LATEST = "LATEST";
const DDB_MAX_BATCH = 25;

const NAME = "name1";
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

/*

  createEmbedding(embedding):
  {
    method: 'createEmbedding',
    embedding: embedding
  }
  
  deleteEmbedding(embedding):
  {
    method: 'deleteEmbedding',
    name: name
  }

  Example test:
  
  {
  "method": "createEmbedding",
  "embedding": {
      "name1" : "embeddingName1",
      "image-method-arn" : "testImageMethodArn1",
      "image-post-method-arn" : "testImagePostMethodArn1",
      "input-height" : 1000,
      "input-width" : 1000,
      "input-depth" : 1,
      "input-channels" : 3,
      "roi-height" : 128,
      "roi-width" : 128,
      "roi-depth" : 1,
      "embedding-vector-length" : 1024
  }
}

*/

// PLATE and WELL arns are optional
function validateEmbedding(embedding: any): boolean {
  if (
    embedding[NAME] &&
    embedding[IMAGE_PROCESSING_ARN_ATTRIBUTE] &&
    embedding[IMAGE_POST_PROCESSING_ARN_ATTRIBUTE] &&
    embedding[INPUT_HEIGHT_ATTRIBUTE] &&
    embedding[INPUT_WIDTH_ATTRIBUTE] &&
    embedding[INPUT_DEPTH_ATTRIBUTE] &&
    embedding[INPUT_CHANNELS_ATTRIBUTE] &&
    embedding[ROI_HEIGHT_ATTRIBUTE] &&
    embedding[ROI_WIDTH_ATTRIBUTE] &&
    embedding[ROI_DEPTH_ATTRIBUTE] &&
    embedding[EMBEDDING_VECTOR_LENGTH_ATTRIBUTE]
  ) {
    return true;
  }
  return false;
}

async function createEmbedding(embedding: any) {
  const params = {
    TableName: TABLE_NAME,
    Item: embedding
  };
  try {
    await db.put(params).promise();
    return { statusCode: 201, body: "" };
  } catch (dbError) {
    return { statusCode: 500, body: JSON.stringify(dbError) };
  }
}

async function deleteEmbedding(name: any) {
   try {
    let rows: any = await dy.getPartitionRows(db, PARTITION_KEY, name, TABLE_NAME);
    let p: any[] = [];
    let i = 0;
    while (i < rows.length) {
      let j = i + DDB_MAX_BATCH;
      if (j > rows.length) {
        j = rows.length;
      }
      p.push(dy.deleteRows(db, PARTITION_KEY, false, TABLE_NAME, rows.slice(i, j)));
      i += j - i;
    }
    await Promise.all(p);
    const response = "deleted " + rows.length + " items";
    return { statusCode: 200, body: response };
  } catch (dbError) {
    return { statusCode: 500, body: JSON.stringify(dbError) };
  } 
}

////////////////////////////////////////////

export const handler = async (event: any = {}): Promise<any> => {
  if (!event.method) {
    console.log("Error: method parameter required - returning status code 400");
    return { statusCode: 400, body: `Error: method parameter required` };
  }

  if (event.method === "createEmbedding") {
    if (event.embedding) {
      if (!validateEmbedding(event.embedding)) {
        return {
          statusCode: 400,
          body: `Error: embedding does not validate`,
        };
      }
      return createEmbedding(event.embedding);
    } else {
      return {
        statusCode: 400,
        body: `Error: embedding required`,
      };
    }
  }

  if (event.method === "deleteEmbedding") {
    if (event.name) {
      return deleteEmbedding(event.name);
    } else {
      return {
        statusCode: 400,
        body: `Error: name required`,
      };
    }
  }
};

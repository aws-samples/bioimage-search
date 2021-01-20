const AWS = require("aws-sdk");
const s3 = new AWS.S3({ apiVersion: "2006-03-01" });
var sqs = new AWS.SQS();
const lambda = new AWS.Lambda({ apiVersion: "2015-03-31" });
const db = new AWS.DynamoDB.DocumentClient();
const dy = require("bioimage-dynamo");
const la = require("bioimage-lambda");
const su = require("short-uuid");

const TABLE_NAME = process.env.TABLE_NAME || "";
const PARTITION_KEY_SRTID = process.env.PARTITION_KEY || "";
const SORT_KEY_IMGID = process.env.SORT_KEY || "";
const TRAINING_CONFIGURATION_LAMBDA_ARN = process.env.TRAINING_CONFIGURATION_LAMBDA_ARN || "";
const IMAGE_MANGEMENT_LAMBDA_ARN = process.env.IMAGE_MANAGEMENT_LAMBDA_ARN || "";
const PROCESS_PLATE_LAMBDA_ARN = process.env.PROCESS_PLATE_LAMBDA_ARN || "";
const MESSAGE_LAMBDA_ARN = process.env.MESSAGE_LAMBDA_ARN || "";
const SEARCH_QUEUE_URL = process.env.SEARCH_QUEUE_URL || "";
const MANAGEMENT_QUEUE_URL = process.env.MANAGEMENT_QUEUE_URL || "";

const LATEST = "LATEST";
const DDB_MAX_BATCH = 25;
const ORIGIN = "origin";

const EUCLIDEAN_METRIC = "Euclidean";
const COSINE_METRIC = "Cosine";

const DEFAULT_MAX_HITS = 100;

const STATUS_SUBMITTED = "submitted";
const STATUS_RUNNING = "running";
const STATUS_COMPLETED = "completed";
const STATUS_ERROR = "error";

// ORIGIN row info - required
const TRAIN_ID = "trainId"
const QUERY_ORIGIN = "queryOrigin";
const QUERY_IMAGE_ID = "queryImageId";

// optional
const INCLUSION_TAG_LIST = "inclusionTags";
const EXCLUSION_TAG_LIST = "exclusionTags";
const SEARCH_METRIC = "searchMetric";
const MAX_HITS = "maxHits";

// report only
const SUBMIT_TIMESTAMP = "submitTimestamp";
const START_TIMESTAMP = "startTimestamp";
const SEARCH_DURATION_MS = "searchDurationMs";
const TOTAL_DURATION_MS = "totalDurationMs";
const STATUS = "status";

// HIT row info
const RANK = "rank";
const DISTANCE = "distance";


/////////////////////////////////////////////////

function getTimestamp() {
  return Date.now().toString()
}

async function submitSearch(search: any) {
  const searchId = su.generate()

  var metric = EUCLIDEAN_METRIC
  if (search[SEARCH_METRIC] && search[SEARCH_METRIC]==COSINE_METRIC) {
    metric = COSINE_METRIC
  }
  
  var maxHits = DEFAULT_MAX_HITS
  if (search[MAX_HITS]) {
    maxHits = search[MAX_HITS]    
  }
  
  const submitTimestamp = getTimestamp()
  const searchEntry = {
    [PARTITION_KEY_SRTID]: searchId,
    [SORT_KEY_IMGID]: ORIGIN,
    [SEARCH_METRIC]: metric,
    [MAX_HITS]: maxHits,
    [SUBMIT_TIMESTAMP]: submitTimestamp
  }
  
  const dynamoParams = {
    TableName: TABLE_NAME,
    Item: searchEntry
  };
  
  const sqsParams = {
    MessageAttributes: {
      "SearchId": {
        DataType: "String",
        StringValue: searchId
      },
    },
    MessageBody: JSON.stringify(searchEntry),
    MessageGroupId: "BioimsSearch",
    MessageDeduplicationId: searchId,
    QueueUrl: SEARCH_QUEUE_URL
  };
  
  const p: any[] = [];
  p.push(db.put(dynamoParams).promise());
  p.push(sqs.sendMessage(sqsParams).promise());
  await Promise.all(p)

  const response = {
    searchId: searchId
  }
  return response
}

// Reads embeddings for all images on the plate, then send SQS message
// with contents to search service.

async function processPlate(trainId: any, plateId: any) {
  var params = {
    FunctionName: IMAGE_MANGEMENT_LAMBDA_ARN,
    InvocationType: "RequestResponse",
    Payload: JSON.stringify({ method: "getImagesByPlateIdAndTrainId", plateId: plateId, trainId: trainId }),
  };
  console.log(params)
  const data = await lambda.invoke(params).promise();
  const imagesResponse = la.getResponseBody(data);
  // imagesResponse is an array of Items:
  // {
  //   Item: {
  //     imageId: '1ajWe94c5g6Ud5acDHfKwS',
  //     embedding: "b'7s/RPJ/sR74ntj++Fc0EvcFMMb7faKm8nK3cvXGv+T0KyYO9qDYEvup/gL68tye+P1oEvksfxD3mdgi+o900PipMj71ag+o8aJrpPVyRfT0u88C82pRHPuj/FD4xJQI+eUcdPjIgv73L4Ba+UwKVu+49tT0YUoQ7cvcmO8j6Yj0='",
  //     roiEmbeddingKey: 'artifact/train/r6KEudzQCuUtDwCzziiMZT/plate/gXc3iRxAi4rs5AdwQpYeiZ/1ajWe94c5g6Ud5acDHfKwS-roi-embedding.npy',
  //     trainId: 'r6KEudzQCuUtDwCzziiMZT'
  //   }
  // },
  const embeddingInfo: any[] = [];
  for (let o1 of imagesResponse) {
    const item = o1.Item
    const imageId = item.imageId
    const embedding = item.embedding
    const trainId = item.trainId
    const entry = {
      imageId: imageId,
      embedding: embedding
    }
    embeddingInfo.push(entry)
  }
  const plateEmbedding = {
    trainId: trainId,
    plateId: plateId,
    data: embeddingInfo
  }
  const messageId = su.generate()
  const sqsParams = {
    MessageBody: createPlateEmbeddingStringMessage(plateEmbedding),
    MessageGroupId: "BioimsSearch",
    MessageDeduplicationId: messageId,
    QueueUrl: SEARCH_QUEUE_URL
  };
  await sqs.sendMessage(sqsParams).promise();
  return messageId;
}

function createPlateEmbeddingStringMessage(plateEmbedding: any) {
  var message="";
  message += "plateEmbedding";
  message += "\n";
  message += plateEmbedding.trainId;
  message += "\n";
  message += plateEmbedding.plateId;
  message += "\n";
  for (let entry of plateEmbedding.data) {
    message += entry.imageId;
    message += "\n";
    message += entry.embedding;
    message += "\n";
  }
  return message;
}

/////////////////////////////////////////////////

export const handler = async (event: any = {}): Promise<any> => {
  if (!event.method) {
    console.log("Error: method parameter required - returning status code 400");
    return { statusCode: 400, body: `Error: method parameter required` };
  }
  
  if (event.method == "submitSearch") {
    if (event.search && event.search.trainId && (event.search.queryOrigin || event.search.queryImageId)) {
      try {
        const response = await submitSearch(event.search);      
        return { statusCode: 200, body: response };
      } catch (dbError) {
        return { statusCode: 500, body: JSON.stringify(dbError) };
      }
    } else {
      return {
        statusCode: 400,
        body: `Error: trainId and either queryOrigin or queryImageId required`,
      };
    }
  } else if (event.method == "processPlate") {
    if (event.trainId &&
        event.plateId) {
      try {
        const response = await processPlate(event.trainId, event.plateId);      
        return { statusCode: 200, body: response };
      } catch (dbError) {
        return { statusCode: 500, body: JSON.stringify(dbError) };
      }
    } else {
      return {
        statusCode: 400,
        body: `Error: trainId and either queryOrigin or queryImageId required`,
      };
    }
  } else {
    return {
      statusCode: 400,
      body: `Error: method ${event.method} not recogized`,
    };
  }

};

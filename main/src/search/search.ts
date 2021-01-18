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
  } else {
    return {
      statusCode: 400,
      body: `Error: method ${event.method} not recogized`,
    };
  }

};

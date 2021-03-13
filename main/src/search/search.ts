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
const DEFAULT_METRIC = COSINE_METRIC;

const DEFAULT_MAX_HITS = 100;

const STATUS_SUBMITTED = "submitted";
const STATUS_RUNNING = "running";
const STATUS_COMPLETED = "completed";
const STATUS_ERROR = "error";

// ORIGIN row info - required
const TRAIN_ID = "trainId"
const QUERY_IMAGE_ID = "queryImageId";

// optional
const INCLUSION_TAG_LIST = "inclusionTags";
const EXCLUSION_TAG_LIST = "exclusionTags";
const METRIC = "metric";
const MAX_HITS = "maxHits";
const REQUIRE_MOA = "requireMoa";

// report only
const SUBMIT_TIMESTAMP = "submitTimestamp";
const START_TIMESTAMP = "startTimestamp";
const SEARCH_DURATION_MS = "searchDurationMs";
const TOTAL_DURATION_MS = "totalDurationMs";
const STATUS = "status";

// HIT row info
const RANK = "rank";
const DISTANCE = "distance";

// Image Table attributes
const IMT_EMBEDDING = "embedding";
const IMT_TAGARR = "tagArr";

const EMBEDDINGS_PER_MESSAGE = 50;


/////////////////////////////////////////////////

function getTimestamp() {
  return Date.now().toString()
}

async function deleteTraining(trainId: any) {
  var messageBody = "deleteTraining\n";
  messageBody += trainId + "\n";
  
  const dedupeId = su.generate();

  const sqsParams = {
    MessageBody: messageBody,
    MessageGroupId: "BioimsSearch",
    MessageDeduplicationId: dedupeId,
    QueueUrl: MANAGEMENT_QUEUE_URL
  };
  
  await sqs.sendMessage(sqsParams).promise();
}

async function logTrainList() {
  const messageBody = "logTrainList\n";
  
  const dedupeId = su.generate();

  const sqsParams = {
    MessageBody: messageBody,
    MessageGroupId: "BioimsSearch",
    MessageDeduplicationId: dedupeId,
    QueueUrl: MANAGEMENT_QUEUE_URL
  };
  
  await sqs.sendMessage(sqsParams).promise();
}

async function loadTagLabelMap() {
  const messageBody = "loadTagLabelMap\n";
  
  const dedupeId = su.generate();

  const sqsParams = {
    MessageBody: messageBody,
    MessageGroupId: "BioimsSearch",
    MessageDeduplicationId: dedupeId,
    QueueUrl: MANAGEMENT_QUEUE_URL
  };
  
  await sqs.sendMessage(sqsParams).promise();
}

async function submitSearch(search: any) {
  const searchId = su.generate()

  var metric = DEFAULT_METRIC;

  if (search[METRIC]) {
    if (search[METRIC]==EUCLIDEAN_METRIC) {
      metric = EUCLIDEAN_METRIC;
    } else if (search[METRIC]==COSINE_METRIC) {
      metric = COSINE_METRIC;
    }
  }

  var maxHits = DEFAULT_MAX_HITS
  if (search[MAX_HITS]) {
    maxHits = search[MAX_HITS]    
  }
  
  const submitTimestamp = getTimestamp
  
  var requireMoa = "false";
  if (search[REQUIRE_MOA]) {
    if (search[REQUIRE_MOA].toLowerCase()=="true") {
      requireMoa = "true";
    }
  }
  
  const searchEntry = {
    [PARTITION_KEY_SRTID]: searchId,
    [SORT_KEY_IMGID]: ORIGIN,
    [TRAIN_ID]: search.trainId,
    [QUERY_IMAGE_ID]: search[QUERY_IMAGE_ID],
    [METRIC]: metric,
    [MAX_HITS]: maxHits,
    [REQUIRE_MOA]: requireMoa,
    [SUBMIT_TIMESTAMP]: submitTimestamp,
     ...(INCLUSION_TAG_LIST in search && {
        [INCLUSION_TAG_LIST]: search[INCLUSION_TAG_LIST],
      }),
     ...(EXCLUSION_TAG_LIST in search && {
        [EXCLUSION_TAG_LIST]: search[EXCLUSION_TAG_LIST],
      }),
  }
  
  const messageBody = generateSearchMessageBody(searchEntry);
  
  const dynamoParams = {
    TableName: TABLE_NAME,
    Item: searchEntry
  };
  
  const sqsParams = {
    MessageBody: messageBody,
    MessageGroupId: "BioimsSearch",
    MessageDeduplicationId: searchId,
    QueueUrl: SEARCH_QUEUE_URL
  };
  
  const p: any[] = [];
  p.push(db.put(dynamoParams).promise());
  p.push(sqs.sendMessage(sqsParams).promise());
  await Promise.all(p)
  await updateSearchStatus(searchId, STATUS_SUBMITTED);

  const response = {
    searchId: searchId
  }
  return response
}

function generateSearchMessageBody(search: any) {
  var messageBody="searchByImageId" + "\n";
  messageBody += search[PARTITION_KEY_SRTID] + "\n";
  messageBody += search[TRAIN_ID] + "\n";
  messageBody += search[QUERY_IMAGE_ID] + "\n";
  messageBody += search[METRIC] + "\n";
  messageBody += search[MAX_HITS] + "\n";
  messageBody += search[REQUIRE_MOA] + "\n";
  if (INCLUSION_TAG_LIST in search) {
    const inclusionTags = search[INCLUSION_TAG_LIST];
    const inclusionTagCount = inclusionTags.length
    messageBody += inclusionTagCount + "\n";
    for (let t of inclusionTags) {
      const tagStr: string = t + "\n";
      messageBody += tagStr;
    }
  } else {
    messageBody += "0\n";
  }
  if (EXCLUSION_TAG_LIST in search) {
    const exclusionTags = search[EXCLUSION_TAG_LIST];
    const exclusionTagCount = exclusionTags.length;
    messageBody += exclusionTagCount + "\n";
    for (let t of exclusionTags) {
      const tagStr: string = t + "\n";
      messageBody += tagStr;
    }
  } else {
    messageBody += "0\n";
  }
  return messageBody;
}

// Reads embeddings for all images on the plate, then send SQS message
// with contents to search service.

async function processPlate(event: any) {
  if (event.trainId) {
    return await processTrainPlate(event.trainId, event.plateId);
  } else if (event.embeddingName) {
    return await processEmbeddingPlate(event.embeddingName, event.plateId);
  }
  return {}
}
  
async function processTrainPlate(trainId: any, plateId: any) {
  
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
  console.log("trainId="+trainId+" plateId="+plateId+" imageResponseCount="+imagesResponse.length);
  for (let o1 of imagesResponse) {
    if (o1.Item) {
      const item = o1.Item
      if (item[IMT_EMBEDDING]) {
        const imageId = item.imageId
        const embedding = item[IMT_EMBEDDING]
        const entry = {
          imageId: imageId,
          embedding: embedding
        }
        embeddingInfo.push(entry)
      }
    }
  }
  console.log("embeddingInfo count="+embeddingInfo.length);
  var embeddingCount=0;
  var embeddingData = [];
  for (let entry of embeddingInfo) {
    embeddingData.push(entry)
    if (embeddingData.length==EMBEDDINGS_PER_MESSAGE) {
      await uploadEmbeddings(trainId, plateId, embeddingData)
      embeddingData = []
    }
  }
  if (embeddingData.length>0) {
    await uploadEmbeddings(trainId, plateId, embeddingData)
  }
  const response = {
    sqsMessageDeduplicationId: 'multiple'
  }
  return response;
}

async function uploadEmbeddings(trainId: any, plateId: any, embeddings: any) {
    const plateEmbedding = {
      trainId: trainId,
      plateId: plateId,
      data: embeddings
    }
    const messageId = su.generate()
    const sqsParams = {
      MessageBody: createPlateEmbeddingStringMessage(plateEmbedding),
      MessageGroupId: "BioimsSearch",
      MessageDeduplicationId: messageId,
      QueueUrl: MANAGEMENT_QUEUE_URL,
    };
    await sqs.sendMessage(sqsParams).promise();
}

async function processEmbeddingPlate(embeddingName: any, plateId: any) {
  var params = {
    FunctionName: IMAGE_MANGEMENT_LAMBDA_ARN,
    InvocationType: "RequestResponse",
    Payload: JSON.stringify({ method: "getImagesByPlateId", plateId: plateId }),
  };
  console.log(params)
  const data = await lambda.invoke(params).promise();
  const imagesResponse = la.getResponseBody(data);
  const tagInfo: any[] = [];
  console.log("embeddingName="+embeddingName+" plateId="+plateId+" imageResponseCount="+imagesResponse.length);
  for (let o1 of imagesResponse) {
    if (o1.Item) {
      const item = o1.Item
      if (item[IMT_TAGARR]) {
        const imageId = item.imageId
        const tagArr = item[IMT_TAGARR]
        const entry = {
          imageId: imageId,
          tagArr: tagArr
        }
        tagInfo.push(entry)
      }
    }
  }
  console.log("tagInfo count="+tagInfo.length);
  const plateTags = {
    embeddingName: embeddingName,
    plateId: plateId,
    data: tagInfo
  }
  const messageId = su.generate()
  const sqsParams = {
    MessageBody: createPlateTagStringMessage(plateTags),
    MessageGroupId: "BioimsSearch",
    MessageDeduplicationId: messageId,
    QueueUrl: MANAGEMENT_QUEUE_URL,
  };
  await sqs.sendMessage(sqsParams).promise();
  const response = {
    sqsMessageDeduplicationId: messageId
  }
  return response;
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

function createPlateTagStringMessage(plateTags: any) {
  var message="";
  message += "plateTags";
  message += "\n";
  message += plateTags.embeddingName;
  message += "\n";
  message += plateTags.plateId;
  message += "\n";
  for (let entry of plateTags.data) {
    const tagArr = entry.tagArr;
    message += entry.imageId;
    message += "\n";
    message += tagArr.length;
    message += "\n";
    for (let t of tagArr) {
      message += t;
      message += "\n"
    }    
  }
  return message;
}

async function createSearchResults(searchId: any, hits: any) {
  console.log("searchId="+searchId)
  const p: any[] = [];
  for (let hit of hits) {
    const searchEntry = {
      [PARTITION_KEY_SRTID]: searchId,
      [SORT_KEY_IMGID]: hit["imageId"],
      [RANK]: hit["rank"],
      [DISTANCE]: hit["distance"]
    };
    const dynamoParams = {
      TableName: TABLE_NAME,
      Item: searchEntry
    };
    p.push(db.put(dynamoParams).promise());
  }
  await Promise.all(p)
  await updateSearchStatus(searchId, STATUS_COMPLETED);
  const response = {
    searchId: searchId,
    hitCount: hits.length
  }
  return response;
}

function statusIsValid(status: any) {
  if (status==STATUS_SUBMITTED ||
      status==STATUS_RUNNING ||
      status==STATUS_COMPLETED ||
      status==STATUS_ERROR) {
    return true;
  } else {
    return false;
  }
}

async function updateSearchStatus(searchId: any,  status: any) {
  const key = {
    [PARTITION_KEY_SRTID]: searchId,
    [SORT_KEY_IMGID]: ORIGIN,
  };
  const expressionAttributeNames =
    '"#s" : "' + [STATUS] + '"';

  const expressionAttributeValues =
    '":s" : "' + status + '"';

  const updateExpression =
    "set #s = :s";

  const namesParse = "{" + expressionAttributeNames + "}";
  const valuesParse = "{" + expressionAttributeValues + "}";

  const params = {
    TableName: TABLE_NAME,
    Key: key,
    UpdateExpression: updateExpression,
    ExpressionAttributeNames: JSON.parse(namesParse),
    ExpressionAttributeValues: JSON.parse(valuesParse),
  };
  console.log(params);
  return await db.update(params).promise();
}

async function getSearchOrigin(searchId: any) {
  const params = {
    TableName: TABLE_NAME,
    Key: {
      [PARTITION_KEY_SRTID]: searchId,
      [SORT_KEY_IMGID]: ORIGIN
    }
  };
  return db.get(params).promise();
}

async function waitForSearch(searchId: any, retries: number) {
  if (retries<0) {
    return {
      searchId: searchId,
      status: "Status timeout"
    }
  } else {
    const searchOrigin = await getSearchOrigin(searchId);
    var status=""
    if (searchOrigin.Item) {
      status=searchOrigin.Item[STATUS]
    }
    if (status==STATUS_COMPLETED || status==STATUS_ERROR) {
      return {
        searchId: searchId,
        status: status
      }
    } else {
      console.log("status="+status)
      const promise = new Promise((resolve) => {
        setTimeout(() => {
          resolve(waitForSearch(searchId, retries-1));
        }, 300)
      });
      return promise;
    }
  }
}

async function getSearchResults(searchId: any) {
  const keyConditionExpression =
    [PARTITION_KEY_SRTID] + " = :" + [PARTITION_KEY_SRTID];
  const expressionAttributeValues =
    '":' + [PARTITION_KEY_SRTID] + '" : "' + searchId + '"';
  const params = {
    TableName: TABLE_NAME,
    KeyConditionExpression: keyConditionExpression,
    ExpressionAttributeValues: JSON.parse(
      "{" + expressionAttributeValues + "}"
    ),
  };
  const searchRows: any[] = await dy.getAllQueryData(db, params);
  console.log("search "+searchId+" returned "+searchRows.length+" rows");
  const resultMap: Map<string, any> = new Map();
  var rowCount=0;
  for (let sr of searchRows) {
    if (sr[SORT_KEY_IMGID]==ORIGIN) {
      resultMap.set(ORIGIN, sr);      
    } else {
      resultMap.set(sr[RANK], sr);
    }
    rowCount+=1
  }
  const searchArray: any[] = [];
  // This can be obtained by specific method
  //searchArray.push(resultMap.get(ORIGIN));
  for (var i=0; i<(rowCount-1); i++) {
    const key=""+i;
    searchArray.push(resultMap.get(key));
  }
  return searchArray;
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
  } else if (event.method == "createSearchResults") {
    if (event.searchId && event.hits) {
      try {
        const response = await createSearchResults(event.searchId, event.hits);      
        return { statusCode: 200, body: response };
      } catch (dbError) {
        return { statusCode: 500, body: JSON.stringify(dbError) };
      }
    } else {
      return {
        statusCode: 400,
        body: `Error: searchId and hits are required`,
      };
    }
  } else if (event.method == "updateSearchStatus") {
    if ( (event.searchId && event.status) && (statusIsValid(event.status)) ) {
      try {
        const response = await updateSearchStatus(event.searchId, event.status);      
        return { statusCode: 200, body: response };
      } catch (dbError) {
        return { statusCode: 500, body: JSON.stringify(dbError) };
      }
    } else {
      return {
        statusCode: 400,
        body: `Error: searchId and a valid status value are required`,
      };
    }
  } else if (event.method == "getSearchResults") {
    if (event.searchId) {
      try {
        const response = await getSearchResults(event.searchId);
        return { statusCode: 200, body: response };
      } catch (dbError) {
        return { statusCode: 500, body: JSON.stringify(dbError) };
      }
    } else {
      return {
        statusCode: 400,
        body: `Error: searchId is required`,
      };
    }
  } else if (event.method == "getSearchStatus") {
    if (event.searchId) {
      try {
        const response = await getSearchOrigin(event.searchId);
        return { statusCode: 200, body: response };
      } catch (dbError) {
        return { statusCode: 500, body: JSON.stringify(dbError) };
      }
    } else {
      return {
        statusCode: 400,
        body: `Error: searchId is required`,
      };
    }
  } else if (event.method == "loadTagLabelMap") {
    try {
      const response = await loadTagLabelMap();
      return { statusCode: 200, body: "success" };
    } catch (dbError) {
      return { statusCode: 500, body: JSON.stringify(dbError) };
    }
  } else if (event.method == "logTrainList") {
    try {
      const response = await logTrainList();
      return { statusCode: 200, body: "success" };
    } catch (dbError) {
      return { statusCode: 500, body: JSON.stringify(dbError) };
    }
  } else if (event.method == "processPlate") {
    if ( (event.trainId && event.plateId) ||
         (event.embeddingName && event.plateId) ) {
      try {
        const response = await processPlate(event);
        return { statusCode: 200, body: response };
      } catch (dbError) {
        return { statusCode: 500, body: JSON.stringify(dbError) };
      }
    } else {
      return {
        statusCode: 400,
        body: `Error: trainId and plateId required`,
      };
    }
  } else if (event.method == "searchByImageId") {
    if (event.trainId &&
        event.imageId) {
      try {
        const submitInfo = await submitSearch(event);
        const response = await waitForSearch(submitInfo.searchId, 100);
        return { statusCode: 200, body: response };
      } catch (dbError) {
        return { statusCode: 500, body: JSON.stringify(dbError) };
      }
    } else {
      return {
        statusCode: 400,
        body: `Error: trainId and imageId are required`,
      };
    }
  } else if (event.method == "deleteTraining") {
    if (event.trainId) {
      try {
        const response = await deleteTraining(event.trainId);
        return { statusCode: 200, body: response };
      } catch (dbError) {
        return { statusCode: 500, body: JSON.stringify(dbError) };
      }
    } else {
      return {
        statusCode: 400,
        body: `Error: embeddingName is required`,
      };
    }
  } else {
    return {
      statusCode: 400,
      body: `Error: method ${event.method} not recogized`,
    };
  }

};

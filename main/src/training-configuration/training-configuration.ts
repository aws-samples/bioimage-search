const AWS = require("aws-sdk");
const db = new AWS.DynamoDB.DocumentClient();
const dy = require("bioimage-dynamo");
const TABLE_NAME = process.env.TABLE_NAME || "";
const PARTITION_KEY_EMB_NAME = process.env.PARTITION_KEY || "";
const TRAIN_INDEX = process.env.TRAIN_INDEX || "";
const SORT_KEY_TRNID = process.env.SORT_KEY || "";
const LATEST = "LATEST";
const DDB_MAX_BATCH = 25;

const ORIGIN = "origin"

// Embedding
const PLATE_PROCESSING_ARN_ATTRIBUTE = "plateMethodArn";
const WELL_PROCESSING_ARN_ATTRIBUTE = "wellMethodArn";
const IMAGE_PROCESSING_ARN_ATTRIBUTE = "imageMethodArn";
const IMAGE_POST_PROCESSING_ARN_ATTRIBUTE = "imagePostMethodArn";
const MODEL_TRAINING_SCRIPT_BUCKET_ATTRIBUTE = "modelTrainingScriptBucket";
const MODEL_TRAINING_SCRIPT_KEY_ATTRIBUTE = "modelTrainingScriptKey";
const TRAINING_INSTANCE_TYPE = "trainingInstanceType";
const TRAINING_HYPERPARAMETERS_ATTRIBUTE = "trainingHyperparameters";
const INPUT_HEIGHT_ATTRIBUTE = "inputHeight";
const INPUT_WIDTH_ATTRIBUTE = "inputWidth";
const INPUT_DEPTH_ATTRIBUTE = "inputDepth";
const INPUT_CHANNELS_ATTRIBUTE = "inputChannels";
const ROI_HEIGHT_ATTRIBUTE = "roiHeight";
const ROI_WIDTH_ATTRIBUTE = "roiWidth";
const ROI_DEPTH_ATTRIBUTE = "roiDepth";
const EMBEDDING_VECTOR_LENGTH_ATTRIBUTE = "embeddingVectorLength";
const COMMENTS_ATTRIBUTE = "comments";

// Training
const FILTER_BUCKET_ATTRIBUTE = "filterBucket";
const FILTER_KEY_ATTRIBUTE = "filterKey";
const SAGEMAKER_TRAIN_ID_ATTRIBUTE = "sagemakerTrainId";
const TRAINING_MESSAGE_ID_ATTRIBUTE = "messageId";
const MODEL_BUCKET_ATTRIBUTE = "modelBucket";
const MODEL_KEY_ATTRIBUTE = "modelKey"

/*

  createEmbedding(embedding):
  {
    method: 'createEmbedding',
    embedding: embedding
  }
  
  deleteEmbedding(embeddingName):
  {
    method: 'deleteEmbedding',
    embeddingName: embeddingName
  }
  
  getEmbedding(embeddingName):
  {
    method: 'getEmbedding',
    embeddingName: embeddingName
  }

  Example test:
  
  {
    "method": "createEmbedding",
    "embedding": {
      "embeddingName1" : "embeddingName1",
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

  createTraining(training):
  {
    method: 'createTraining',
    training: training
  }
  
  deleteTraining(training):
  {
    method: 'deleteTraining',
    trainId: trainId
  }
  
  updateTraining(training):
  {
     method: 'updateTraining',
     training: training
  }

*/

function validateTraining(training: any): boolean {
  if (
    training[PARTITION_KEY_EMB_NAME] &&
    training[SORT_KEY_TRNID] &&
    training[TRAINING_MESSAGE_ID_ATTRIBUTE]
  ) {
    return true;
  }
  return false;
}

function validTrainAttribute(attribute: any): boolean {
  if (attribute === FILTER_BUCKET_ATTRIBUTE ||
    attribute === FILTER_KEY_ATTRIBUTE ||
    attribute === SAGEMAKER_TRAIN_ID_ATTRIBUTE ||
    attribute === TRAINING_MESSAGE_ID_ATTRIBUTE ||
    attribute === MODEL_BUCKET_ATTRIBUTE ||
    attribute === MODEL_KEY_ATTRIBUTE) {
      return true;
    }
    return false;
}

async function createTraining(training: any) {
  const params = {
    TableName: TABLE_NAME,
    Item: training
  };
  return db.put(params).promise();
}

async function getEmbeddingNameForTrainId(trainId: any) {
  const keyConditionExpression =
    [SORT_KEY_TRNID] + " = :" + [SORT_KEY_TRNID];
  const expressionAttributeValues =
    '":' + [SORT_KEY_TRNID] + '" : "' + trainId + '"';
  const params = {
    TableName: TABLE_NAME,
    IndexName: TRAIN_INDEX,
    KeyConditionExpression: keyConditionExpression,
    ExpressionAttributeValues: JSON.parse(
      "{" + expressionAttributeValues + "}"
    ),
  };
  const trainRowInfo: any[] = await dy.getAllQueryData(db, params);
  const row = trainRowInfo[0];
  return row[PARTITION_KEY_EMB_NAME]
}

async function updateTraining(trainId: any, attribute: any, value: any) {
  if (!validTrainAttribute(attribute)) {
    return { statusCode: 500, body: `Invalid attribute ${attribute}` }
  }
  const embeddingName = await getEmbeddingNameForTrainId(trainId)
  const setStr = `set ${attribute} = :val1`
  
  var params = {
    TableName:TABLE_NAME,
    Key:{
      [PARTITION_KEY_EMB_NAME]: embeddingName,
      [SORT_KEY_TRNID]: trainId,
    },
    UpdateExpression: setStr,
    ExpressionAttributeValues: JSON.parse(
      "{" + '":val1"' +':' + '"' + value + '"' + "}"
      ),
    ReturnValues:"UPDATED_NEW"
  };

  return db.update(params).promise();
}

async function deleteTraining(trainId: any) {
  const embeddingName = await getEmbeddingNameForTrainId(trainId)
  const deleteParams = {
    TableName: TABLE_NAME,
    Key: {
      [PARTITION_KEY_EMB_NAME]: embeddingName,
      [SORT_KEY_TRNID]: trainId
    }
  };
  return db.delete(deleteParams).promise();
}

async function getTraining(trainId: any) {
  const embeddingName = await getEmbeddingNameForTrainId(trainId)
  const params = {
    TableName: TABLE_NAME,
    Key: {
      [PARTITION_KEY_EMB_NAME]: embeddingName,
      [SORT_KEY_TRNID]: trainId
    }
  };
  return db.get(params).promise();
}

// PLATE and WELL arns are optional
function validateEmbedding(embedding: any): boolean {
  if (
    embedding[PARTITION_KEY_EMB_NAME] &&
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
  embedding[SORT_KEY_TRNID] = ORIGIN
  const params = {
    TableName: TABLE_NAME,
    Item: embedding,
  };
  return db.put(params).promise();
}

async function deleteEmbedding(embeddingName: any) {
  let rows: any = await dy.getPartitionRows(
    db,
    PARTITION_KEY_EMB_NAME,
    embeddingName,
    TABLE_NAME
  );
  let p: any[] = [];
  let i = 0;
  while (i < rows.length) {
    let j = i + DDB_MAX_BATCH;
    if (j > rows.length) {
      j = rows.length;
    }
    p.push(
      dy.deleteRows(db, PARTITION_KEY_EMB_NAME, false, TABLE_NAME, rows.slice(i, j))
    );
    i += j - i;
  }
  return Promise.all(p);
}

async function getEmbeddingInfo(embeddingName: any) {
  const params = {
    TableName: TABLE_NAME,
    Key: {
      [PARTITION_KEY_EMB_NAME]: embeddingName,
      [SORT_KEY_TRNID]: ORIGIN,
    },
  };
  return db.get(params).promise();
}

async function getEmbeddingTrainings(embeddingName: any) {
  const keyConditionExpression = [PARTITION_KEY_EMB_NAME] + " = :" + [PARTITION_KEY_EMB_NAME];
  const expressionAttributeValues =
    '":' + [PARTITION_KEY_EMB_NAME] + '" : "' + embeddingName + '"';
  const params = {
    TableName: TABLE_NAME,
    KeyConditionExpression: keyConditionExpression,
    ExpressionAttributeValues: JSON.parse(
      "{" + expressionAttributeValues + "}"
    ),
  };
  const result: any = await dy.getAllQueryData(db, params);
  return result;
}


/////////////////////////////////////////////////

export const handler = async (event: any = {}): Promise<any> => {
  if (!event.method) {
    console.log("Error: method parameter required - returning status code 400");
    return { statusCode: 400, body: `Error: method parameter required` };
  }

  if (event.method === "createTraining") {
    if (event.training) {
      if (!validateTraining(event.training)) {
        return {
          statusCode: 400,
          body: `Error: training does not validate`,
        };
      }
      try {
        const response = await createTraining(event.training);
        return { statusCode: 200, body: JSON.stringify(response) };
      } catch (dbError) {
        return { statusCode: 500, body: JSON.stringify(dbError) };
      }
    } else {
      return {
        statusCode: 400,
        body: `Error: embedding required`,
      };
    }
  }
  
  else if (event.method === "getTraining") {
      if (event.trainId) {
        try {
          const response = await getTraining(event.trainId)
          const item = response.Item;
          return { statusCode: 200, body: item };
        } catch (dbError) {
          return { statusCode: 500, body: JSON.stringify(dbError) };
        }
      } else {
          return {
              statusCode: 400,
              body: `Error: trainId required`,
          }
      }
  }
  
  else if (event.method === "updateTraining") {
    if (event.trainId && event.attribute && event.value) {
      try {
        const response = await updateTraining(event.trainId, event.attribute, event.value);
        return { statusCode: 201, body: JSON.stringify(response) };
      } catch (dbError) {
        return { statusCode: 500, body: JSON.stringify(dbError) };
      }
    } else {
        return {
            statusCode: 400,
            body: `Error: training update violates existing integrity`,
        };
    }
  }

  else if (event.method === "deleteTraining") {
    if (event.trainId) {
      try {
        const response = await deleteTraining(event.trainId);
        return { statusCode: 200, body: JSON.stringify(response) };
      } catch (dbError) {
        return { statusCode: 500, body: JSON.stringify(dbError) };
      }
    } else {
      return {
        statusCode: 400,
        body: `Error: trainId required`,
      };
    }
  }
  
  else if (event.method === "createEmbedding") {
    if (event.embedding) {
      if (!validateEmbedding(event.embedding)) {
        return {
          statusCode: 400,
          body: `Error: embedding does not validate`,
        };
      }
      try {
        const response = await createEmbedding(event.embedding);
        return { statusCode: 200, body: JSON.stringify(response) }
      } catch (dbError) {
        return { statusCode: 500, body: JSON.stringify(dbError) };        
      }
    } else {
      return {
        statusCode: 400,
        body: `Error: embedding required`,
      };
    }
  }

  else if (event.method === "getEmbeddingInfo") {
    if (event.embeddingName) {
      try {
        const response = await getEmbeddingInfo(event.embeddingName);
        return { statusCode: 200, body: response };
      } catch (dbError) {
        return { statusCode: 500, body: JSON.stringify(dbError) };
      }
    } else {
      return {
        statusCode: 400,
        body: `Error: embeddingName required`,
      };
    }
  }

  else if (event.method === "getEmbeddingTrainings") {
    if (event.embeddingName) {
      try {
        const response = await getEmbeddingTrainings(event.embeddingName);
        return { statusCode: 200, body: JSON.stringify(response) };
      } catch (dbError) {
        return { statusCode: 500, body: JSON.stringify(dbError) };
      }
    } else {
      return {
        statusCode: 400,
        body: `Error: embeddingName required`,
      };
    }
  }

  else if (event.method === "deleteEmbedding") {
    if (event.embeddingName) {
      try {
        const response = await deleteEmbedding(event.embeddingName)
        return { statusCode: 200, body: JSON.stringify(response) };
      } catch (dbError) {
        return { statusCode: 500, body: JSON.stringify(dbError) };
      }
    } else {
      return {
        statusCode: 400,
        body: `Error: name required`,
      };
    }
  }

};
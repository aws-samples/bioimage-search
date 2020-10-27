const AWS = require("aws-sdk");
const db = new AWS.DynamoDB.DocumentClient();
const dy = require("bioimage-dynamo");
const TABLE_NAME = process.env.TABLE_NAME || "";
const PARTITION_KEY = process.env.PARTITION_KEY || "";
const LATEST = "LATEST";
const DDB_MAX_BATCH = 25;

const FILTER_BUCKET_ATTRIBUTE = "filterBucket";
const FILTER_INCLUDE_KEY_ATTRIBUTE = "filterIncludeKey";
const FILTER_EXCLUDE_KEY_ATTRIBUTE = "filterExcludeKey";
const EMBEDDING_NAME_ATTRIBUTE = "embeddingName";
const SAGEMAKER_TRAIN_ID_ATTRIBUTE = "sagemakerTrainId";
const TRAINING_JOB_MESSAGE_ID_ATTRIBUTE = "trainMessageId";
const MODEL_BUCKET_ATTRIBUTE = "modelBucket";
const MODEL_KEY_ATTRIBUTE = "modelKey"

/*

  createTraining(training):
  {
    method: 'createTraining',
    training: training
  }
  
  deleteTraining(training):
  {
    method: 'deleteTraining',
    train_id: train_id
  }
  
  updateTraining(training):
  {
     method: 'updateTraining',
     training: training
  }

*/

function validateTraining(training: any): boolean {
  if (
    training[PARTITION_KEY] &&
    training[EMBEDDING_NAME_ATTRIBUTE]
  ) {
    return true;
  }
  return false;
}

function validAttribute(attribute: any): boolean {
  if (attribute === FILTER_BUCKET_ATTRIBUTE ||
    attribute === FILTER_INCLUDE_KEY_ATTRIBUTE ||
    attribute === FILTER_EXCLUDE_KEY_ATTRIBUTE ||
    attribute === EMBEDDING_NAME_ATTRIBUTE ||
    attribute === SAGEMAKER_TRAIN_ID_ATTRIBUTE ||
    attribute === TRAINING_JOB_MESSAGE_ID_ATTRIBUTE ||
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
  try {
    await db.put(params).promise();
    return { statusCode: 201, body: "" };
  } catch (dbError) {
    return { statusCode: 500, body: JSON.stringify(dbError) };
  }  
}

async function updateTraining(train_id: any, attribute: any, value: any) {
  if (!validAttribute(attribute)) {
    return { statusCode: 500, body: `Invalid attribute ${attribute}` }
  }
  const setStr = `set ${attribute} = :val1`
  
  var params = {
    TableName:TABLE_NAME,
    Key:{
      [PARTITION_KEY]: train_id
    },
    UpdateExpression: setStr,
    ExpressionAttributeValues: JSON.parse(
      "{" + '":val1"' +':' + '"' + value + '"' + "}"
      ),
    ReturnValues:"UPDATED_NEW"
  };
  
  const response = db.update(params).promise();
  return response
}

async function deleteTraining(train_id: any) {
  const deleteParams = {
    TableName: TABLE_NAME,
    Key: {
      [PARTITION_KEY]: train_id
    }
  };
  try {
    await db.delete(deleteParams).promise();
    return { statusCode: 201, body: "" }
  } catch (dbError) {
    return { statusCode: 500, body: JSON.stringify(dbError) };
  }
}

async function getTraining(train_id: any) {
    const params = {
      TableName: TABLE_NAME,
      Key: {
        [PARTITION_KEY]: train_id
      }
  };
  try {
    const response = await db.get(params).promise();
    return { statusCode: 200, body: JSON.stringify(response.Item) };
  } catch (dbError) {
    return { statusCode: 500, body: JSON.stringify(dbError) };
  }
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
      return createTraining(event.training);
    } else {
      return {
        statusCode: 400,
        body: `Error: embedding required`,
      };
    }
  }
  
  else if (event.method === "getTraining") {
      if (event.train_id) {
          return getTraining(event.train_id)
      } else {
          return {
              statusCode: 400,
              body: `Error: train_id required`,
          }
      }
  }
  
  else if (event.method === "updateTraining") {
    if (event.train_id && event.attribute && event.value) {
      try {
        await updateTraining(event.train_id, event.attribute, event.value);
        console.log("post updateTraining")
        return { statusCode: 201, body: "" };
      } catch (dbError) {
        const errMsg = "dbError=" + JSON.stringify(dbError)
        console.log(errMsg)
        return { statusCode: 500, body: errMsg };
      }
    } else {
        return {
            statusCode: 400,
            body: `Error: training update violates existing integrity`,
        };
    }
  }

  else if (event.method === "deleteTraining") {
    if (event.train_id) {
      return deleteTraining(event.train_id);
    } else {
      return {
        statusCode: 400,
        body: `Error: train_id required`,
      };
    }
  }
  
};
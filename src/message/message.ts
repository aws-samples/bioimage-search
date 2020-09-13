const AWS = require("aws-sdk");
const { v4: uuidv4 } = require('uuid')
const db = new AWS.DynamoDB.DocumentClient();
const TABLE_NAME = process.env.TABLE_NAME || "";
const PARTITION_KEY = process.env.PARTITION_KEY || "";
const SORT_KEY = process.env.SORT_KEY || "";
const DETAIL_ATTRIBUTE = "detail";
const LATEST = "LATEST";
const DDB_MAX_BATCH = 25;

/*

Request format:

getMessage(messageId):
    {
        method: 'getMessage',
        messageId: messageId
    }
    
createMessage(message):
    {
        method: 'createMessage',
        message: message
    }
    
listMessage(messageId):
    {
        method: 'listMessages',
        messageId: messageId
    }

addMessage(messageId, message):
    {
        method: 'addMessage',
        messageId: messageId,
        message: message
    }
    
deleteMessage(messageId):
  {
    method: 'deleteMessage',
    mesageId: messageId
  }

*/

//////////////////////////////////////////////
//
// COMMON
//
//
//////////////////////////////////////////////

const getAllQueryData = async (params: any) => {
  const _getAllData = async (params: any, startKey: any) => {
    if (startKey) {
      params.ExclusiveStartKey = startKey;
    }
    return db.query(params).promise();
  };
  let lastEvaluatedKey = null;
  let rows: any[] = [];
  do {
    const result: any = await _getAllData(params, lastEvaluatedKey);
    rows = rows.concat(result.Items);
    lastEvaluatedKey = result.LastEvaluatedKey;
  } while (lastEvaluatedKey);
  return rows;
};

const getAllScanData = async (params: any) => {
  const _getAllData = async (params: any, startKey: any) => {
    if (startKey) {
      params.ExclusiveStartKey = startKey;
    }
    return db.scan(params).promise();
  };
  let lastEvaluatedKey = null;
  let rows: any[] = [];
  do {
    const result: any = await _getAllData(params, lastEvaluatedKey);
    rows = rows.concat(result.Items);
    lastEvaluatedKey = result.LastEvaluatedKey;
  } while (lastEvaluatedKey);
  return rows;
};

async function deleteRows(rows: any[]) {
  let delarr: any[] = [];
  for (let r of rows) {
    const pk = r[PARTITION_KEY];
    const sk = r[SORT_KEY];
    const dr = {
      DeleteRequest: { Key: { [PARTITION_KEY]: pk, [SORT_KEY]: sk } },
    };
    delarr.push(dr);
  }
  const requestItems = { [TABLE_NAME]: delarr };
  const params = { RequestItems: requestItems };
  return db.batchWrite(params).promise();
}

//////////////////////////////////////////////

async function getMessage(messageId: any) {
  const params = {
    TableName: TABLE_NAME,
    Key: {
      [PARTITION_KEY]: messageId,
      [SORT_KEY]: LATEST,
    },
  };
  try {
    const response = await db.get(params).promise();
    return { statusCode: 200, body: JSON.stringify(response.Item) };
  } catch (dbError) {
    return { statusCode: 500, body: JSON.stringify(dbError) };
  }
}

async function createMessage(message: any) {
  const id = uuidv4();
  const item = {
    [PARTITION_KEY]: id,
    [SORT_KEY]: LATEST,
    [DETAIL_ATTRIBUTE]: message,
  };
  const itemTimestamp = {
    [PARTITION_KEY]: id,
    [SORT_KEY]: Date.now().toString(),
    [DETAIL_ATTRIBUTE]: message,
  };
  const params = {
    TableName: TABLE_NAME,
    Item: item,
  };
  const paramsTimestamp = {
    TableName: TABLE_NAME,
    Item: itemTimestamp,
  };
  try {
    const p: any[] = []
    p.push(db.put(params).promise());
    p.push(db.put(paramsTimestamp).promise());
    await Promise.all(p)
    const response = { messageId: id }
    return { statusCode: 201, body: JSON.stringify(response) };
  } catch (dbError) {
    return { statusCode: 500, body: JSON.stringify(dbError) };
  }
}

async function addMessage(messageId: any, message: any) {
  const validationItem = {
    [PARTITION_KEY]: messageId,
    [SORT_KEY]: LATEST,
  }
  const item = {
    [PARTITION_KEY]: messageId,
    [SORT_KEY]: LATEST,
    [DETAIL_ATTRIBUTE]: message,
  };
  const itemTimestamp = {
    [PARTITION_KEY]: messageId,
    [SORT_KEY]: Date.now().toString(),
    [DETAIL_ATTRIBUTE]: message,
  };
  const validationParams = {
    TableName: TABLE_NAME,
    Item: validationItem,
  }
  const params = {
    TableName: TABLE_NAME,
    Item: item,
  };
  const paramsTimestamp = {
    TableName: TABLE_NAME,
    Item: itemTimestamp,
  };
  try {
    const validation = await db.get(validationParams).promise();
    if (!validation[PARTITION_KEY]) {
        return { statusCode: 400, body: 'messageId must already exist' }
    }
    const p: any[] = []
    p.push(db.put(params).promise());
    p.push(db.put(paramsTimestamp).promise());
    await Promise.all(p)
    const response = { messageId: messageId  }
    return { statusCode: 201, body: JSON.stringify(response) };
  } catch (dbError) {
    return { statusCode: 500, body: JSON.stringify(dbError) };
  }
}

async function listMessage(messageId: any) {
  const keyConditionExpression = [PARTITION_KEY] + " = :" + [PARTITION_KEY];
  const expressionAttributeValues =
    '":' + [PARTITION_KEY] + '" : "' + messageId + '"';
  const params = {
    TableName: TABLE_NAME,
    KeyConditionExpression: keyConditionExpression,
    ExpressionAttributeValues: JSON.parse(
      "{" + expressionAttributeValues + "}"
    ),
  };
  const result: any = await getAllQueryData(params);
  return result;
}

async function deleteMessage(messageId: any) {
  try {
    let rows: any = await listMessage(messageId);
    let p: any[] = [];
    let i = 0;
    while (i < rows.length) {
      let j = i + DDB_MAX_BATCH;
      if (j > rows.length) {
        j = rows.length;
      }
      p.push(deleteRows(rows.slice(i, j)));
      i += j - i;
    }
    await Promise.all(p);
    const response = "deleted " + rows.length + " message rows";
    return { statusCode: 200, body: response };
  } catch (dbError) {
    return { statusCode: 500, body: JSON.stringify(dbError) };
  }
}


/////////////////

export const handler = async (event: any = {}): Promise<any> => {
  if (!event.method) {
    return { statusCode: 400, body: `Error: method parameter required` };
  }

  if (event.method === "getMessage") {
    if (event.messageId) {
      return getMessage(event.messageId);
    } else {
      return { statusCode: 400, body: `Error: messageId required` };
    }
  }

  if (event.method === "createMessage") {
    if (event.message) {
      return createMessage(event.message);
    } else {
      return { statusCode: 400, body: `Error: message required` };
    }
  }

  if (event.method === "listMessage") {
    if (event.messageId) {
      try {
        const rows = await listMessage(event.messageId);
        return { statusCode: 200, body: JSON.stringify(rows) };
      } catch (dbError) {
        return { statusCode: 500, body: JSON.stringify(dbError) };
      }
    } else {
      return { statusCode: 400, body: `Error: messageId required` };
    }
  }

  if (event.method === "deleteMessage") {
    if (event.messageId) {
      return deleteMessage(event.messageId);
    } else {
      return { statusCode: 400, body: `Error: messageId required` };
    }
  }

  return { statusCode: 400, body: `Error: valid method parameter required` };
};

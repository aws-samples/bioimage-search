const AWS = require("aws-sdk");
const { v4: uuidv4 } = require('uuid')
const db = new AWS.DynamoDB.DocumentClient();
const dy = require("bioimage-dynamo")
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

async function getMessage(messageId: any) {
  const params = {
    TableName: TABLE_NAME,
    Key: {
      [PARTITION_KEY]: messageId,
      [SORT_KEY]: LATEST,
    },
  };
  return db.get(params).promise();
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
  const p: any[] = []
  p.push(db.put(params).promise());
  p.push(db.put(paramsTimestamp).promise());
  await Promise.all(p)
  const response = { messageId: id }
  return response;
}

async function addMessage(messageId: any, message: any) {
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
    Key: {
      [PARTITION_KEY]: messageId,
      [SORT_KEY]: LATEST,
    },
  };
  const params = {
    TableName: TABLE_NAME,
    Item: item,
  };
  const paramsTimestamp = {
    TableName: TABLE_NAME,
    Item: itemTimestamp,
  };
  const validation = await db.get(validationParams).promise();
  if (!validation.Item[PARTITION_KEY]) {
    throw new Error('messageId must already exist')
  }
  const p: any[] = []
  p.push(db.put(params).promise());
  p.push(db.put(paramsTimestamp).promise());
  await Promise.all(p)
  const response = { messageId: messageId  }
  return response
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
  const result: any = await dy.getAllQueryData(db, params);
  return result;
}

async function deleteMessage(messageId: any) {
  let rows: any = await listMessage(messageId);
  let p: any[] = [];
  let i = 0;
  while (i < rows.length) {
    let j = i + DDB_MAX_BATCH;
    if (j > rows.length) {
      j = rows.length;
    }
    p.push(dy.deleteRows(db, PARTITION_KEY, SORT_KEY, TABLE_NAME, rows.slice(i, j)));
    i += j - i;
  }
  return Promise.all(p);
}


//////////////////////////////////////////////////////


export const handler = async (event: any = {}): Promise<any> => {
  if (!event.method) {
    return { statusCode: 400, body: `Error: method parameter required` };
  }

  if (event.method === "getMessage") {
    if (event.messageId) {
      try {
        const response = await getMessage(event.messageId);
        return { statusCode: 200, body: JSON.stringify(response) };
      } catch (dbError) {
        return { statusCode: 500, body: JSON.stringify(dbError) };
      }
    } else {
      return { statusCode: 400, body: `Error: messageId required` };
    }
  }

  if (event.method === "createMessage") {
    if (event.message) {
      try {
        const response = await createMessage(event.message);
        return { statusCode: 200, body: JSON.stringify(response) };
      } catch (dbError) {
        return { statusCode: 500, body: JSON.stringify(dbError) };
      }
    } else {
      return { statusCode: 400, body: `Error: message required` };
    }
  }
  
  if (event.method === "addMessage") {
    if (event.messageId && event.message) {
      try {
        const response = await addMessage(event.messageId, event.message);
        return { statusCode: 200, body: response };
      } catch (dbError) {
        return { statusCode: 500, body: JSON.stringify(dbError) };
      }
    } else {
      return { statusCode: 400, body: `Error: messageId and message required` };
    }
  }

  if (event.method === "listMessage") {
    if (event.messageId) {
      try {
        const rows = await listMessage(event.messageId);
        const a: any [] = []
        for (let r of rows) {
          const message = r[DETAIL_ATTRIBUTE]
          const timestamp = r[SORT_KEY]
          a.push({ message: message, timestamp: timestamp })
        }
        return { statusCode: 200, body: JSON.stringify(a) };
      } catch (dbError) {
        return { statusCode: 500, body: JSON.stringify(dbError) };
      }
    } else {
      return { statusCode: 400, body: `Error: messageId required` };
    }
  }

  if (event.method === "deleteMessage") {
    if (event.messageId) {
      try {
        const response = await deleteMessage(event.messageId);
        return { statusCode: 200, body: JSON.stringify(response) };
      } catch (dbError) {
        return { statusCode: 500, body: JSON.stringify(dbError) };
      }
    } else {
      return { statusCode: 400, body: `Error: messageId required` };
    }
  }

  return { statusCode: 400, body: `Error: valid method parameter required` };
};

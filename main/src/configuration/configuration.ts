const AWS = require("aws-sdk");
const db = new AWS.DynamoDB.DocumentClient();
const dy = require("bioimage-dynamo")
const TABLE_NAME = process.env.TABLE_NAME || "";
const PARTITION_KEY = process.env.PARTITION_KEY || "";
const SORT_KEY = process.env.SORT_KEY || "";
const VALUE_ATTRIBUTE = "value";
const LATEST = "LATEST";
const DEFAULT_TRAIN_ID = "DefaultTrainId";
const DDB_MAX_BATCH = 25;

/*

Request format:

getAll():
    {
        method: 'getAll',
    }
    
getParameter(key):
    {
        method: 'getParameter',
        key: key
    }
    
setParameter(key, value):
    {
        method: 'setParameter',
        key: key,
        value: value
    }
    
getHistory(key):
    {
        method: 'getHistory',
        key: key
    }

getDefaultTrainId():
    {
        method: 'getDefaultTrainId'
    }
    
setDefaultTrainId():
    {
        method: 'setDefaultTrainId',
        trainId: trainId
    }
    
deleteKey(key):
  {
    method: 'deleteKey',
    key: key
  }

*/

async function getParameter(key: any) {
  const params = {
    TableName: TABLE_NAME,
    Key: {
      [PARTITION_KEY]: key,
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

async function setParameter(key: any, value: any) {
  const item = {
    [PARTITION_KEY]: key,
    [SORT_KEY]: LATEST,
    [VALUE_ATTRIBUTE]: value,
  };
  const itemTimestamp = {
    [PARTITION_KEY]: key,
    [SORT_KEY]: Date.now().toString(),
    [VALUE_ATTRIBUTE]: value,
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
    await db.put(params).promise();
    await db.put(paramsTimestamp).promise();
    return { statusCode: 201, body: "" };
  } catch (dbError) {
    return { statusCode: 500, body: JSON.stringify(dbError) };
  }
}

async function getHistoryRows(key: any) {
  const keyConditionExpression = [PARTITION_KEY] + " = :" + [PARTITION_KEY];
  const expressionAttributeValues =
    '":' + [PARTITION_KEY] + '" : "' + key + '"';
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

async function getAll() {
  const filterExpression = [SORT_KEY] + " = :" + [SORT_KEY];
  const expressionAttributeValues = '":' + [SORT_KEY] + '" : "' + LATEST + '"';
  const params = {
    TableName: TABLE_NAME,
    FilterExpression: filterExpression,
    ExpressionAttributeValues: JSON.parse(
      "{" + expressionAttributeValues + "}"
    ),
  };
  try {
    const rows = await dy.getAllScanData(db, params);
    return { statusCode: 200, body: JSON.stringify(rows) };
  } catch (dbError) {
    return { statusCode: 500, body: JSON.stringify(dbError) };
  }
}

async function deleteParameter(key: any) {
  try {
    let rows: any = await getHistoryRows(key);
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
    await Promise.all(p);
    const response = "deleted " + rows.length + " items";
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

  if (event.method === "getParameter") {
    if (event.key) {
      return getParameter(event.key);
    } else {
      return { statusCode: 400, body: `Error: key required` };
    }
  }

  if (event.method === "setParameter") {
    if (event.key && event.value) {
      return setParameter(event.key, event.value);
    } else {
      return { statusCode: 400, body: `Error: key and value required` };
    }
  }

  if (event.method === "getHistory") {
    if (event.key) {
      try {
        const rows = await getHistoryRows(event.key);
        return { statusCode: 200, body: JSON.stringify(rows) };
      } catch (dbError) {
        return { statusCode: 500, body: JSON.stringify(dbError) };
      }
    } else {
      return { statusCode: 400, body: `Error: key required` };
    }
  }

  if (event.method === "getAll") {
    return getAll();
  }

  if (event.method === "getDefaultTrainId") {
    return getParameter(DEFAULT_TRAIN_ID);
  }

  if (event.method === "setDefaultTrainId") {
    return setParameter(DEFAULT_TRAIN_ID, event.value);
  }

  if (event.method === "deleteParameter") {
    if (event.key) {
      return deleteParameter(event.key);
    } else {
      return { statusCode: 400, body: `Error: key parameter required` };
    }
  }

  return { statusCode: 400, body: `Error: valid method parameter required` };
};

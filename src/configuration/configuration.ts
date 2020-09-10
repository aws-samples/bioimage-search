const AWS = require("aws-sdk");
const db = new AWS.DynamoDB.DocumentClient();
const TABLE_NAME = process.env.TABLE_NAME || "";
const PARTITION_KEY = process.env.PARTITION_KEY || "";
const SORT_KEY = process.env.SORT_KEY || "";
const VALUE_ATTRIBUTE = "value";
const LATEST = "LATEST";
const DEFAULT_TRAIN_ID = "DefaultTrainId";
const DDB_MAX_BATCH=25

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

export const handler = async (event: any = {}): Promise<any> => {
  if (!event.method) {
    console.log("Error: method parameter required - returning statusCode 400");
    return { statusCode: 400, body: `Error: method parameter required` };
  }

  if (event.method === "getParameter") {
    return getParameter(event.key);
  }

  async function getParameter(key: any) {
    if (!key) {
      return { statusCode: 400, body: `Error: key parameter required` };
    }
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

  if (event.method === "setParameter") {
    return setParameter(event.key, event.value);
  }

  async function setParameter(key: any, value: any) {
    if (!(key && value)) {
      return {
        statusCode: 400,
        body: `Error: key and value parameters required`,
      };
    }
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

  if (event.method === "getHistory") {
    try {
      const rows = await getHistoryRows(event.key);
      return { statusCode: 200, body: JSON.stringify(rows) };
    } catch (dbError) {
      return { statusCode: 500, body: JSON.stringify(dbError) };
    }
  }
  
  async function getHistoryRows(key: any) {
    if (!key) {
      return { statusCode: 400, body: `Error: key parameter required` };
    }
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
    const result: any = await getAllQueryData(params);
    console.log("getHistoryRows result="+result)
    return result
  }

  if (event.method === "getAll") {
    const filterExpression = [SORT_KEY] + " = :" + [SORT_KEY];
    const expressionAttributeValues =
      '":' + [SORT_KEY] + '" : "' + LATEST + '"';
    const params = {
      TableName: TABLE_NAME,
      FilterExpression: filterExpression,
      ExpressionAttributeValues: JSON.parse(
        "{" + expressionAttributeValues + "}"
      ),
    };
    try {
      const rows = await getAllScanData(params);
      return { statusCode: 200, body: JSON.stringify(rows) };
    } catch (dbError) {
      return { statusCode: 500, body: JSON.stringify(dbError) };
    }
  }

  if (event.method === "getDefaultTrainId") {
    return getParameter(DEFAULT_TRAIN_ID);
  }

  if (event.method === "setDefaultTrainId") {
    return setParameter(DEFAULT_TRAIN_ID, event.value);
  }
  
  if (event.method === 'deleteParameter') {
    if (!event.key) {
      return { statusCode: 400, body: `Error: key parameter required` };
    }
    try {
      let rows: any = await getHistoryRows(event.key)
      let p: any[] = []
      let i=0
      while (i<rows.length) {
        let j=i+DDB_MAX_BATCH
        if (j>rows.length) {
          j=rows.length
        }
        p.push(deleteRows(rows.slice(i,j)))
        i+=(j-i)
      }
      await Promise.all(p)
      const response = "deleted " + rows.length + " items"
      return { statusCode: 200, body: response };
    } catch (dbError) {
      return { statusCode: 500, body: JSON.stringify(dbError) };
    }   
  }
    
  async function deleteRows(rows: any[]) {
    let delarr: any[] = []
    for (let r of rows) {
      const pk = r[PARTITION_KEY]
      const sk = r[SORT_KEY]
      const dr = { DeleteRequest: { Key: { [PARTITION_KEY]: pk, [SORT_KEY]: sk } } }
      delarr.push(dr)
    }
    const requestItems = { [TABLE_NAME]: delarr }
    const params = { RequestItems: requestItems }
    return db.batchWrite(params).promise();
  }

  return { statusCode: 400, body: `Error: valid method parameter required` };
};

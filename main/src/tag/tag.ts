const AWS = require("aws-sdk");
const db = new AWS.DynamoDB.DocumentClient();
const dy = require("bioimage-dynamo")
const TABLE_NAME = process.env.TABLE_NAME || "";
const PARTITION_KEY = process.env.PARTITION_KEY || "";
const SORT_KEY = process.env.SORT_KEY || "";
const DDB_MAX_BATCH = 25;
const ID_TYPE = "id";
const COUNTER_TYPE = "counter"
const UNIQUE_TYPE = "unique"
const NEXT_ID = "nextId"
const ID = "id"
const VALUE = "value"

async function getNextId() {
  const updateExpStr = "set " + ID + " = " + ID + " + :num";
  try {
    const params1 = {
      TableName: TABLE_NAME,
      Key: {
        [PARTITION_KEY]: NEXT_ID,
        [SORT_KEY]: COUNTER_TYPE,
      },
      UpdateExpression: updateExpStr,
      ExpressionAttributeValues: {
        ":num": 1
      },
      ReturnValues: "UPDATED_OLD"
    };
    const result = await db.update(params1).promise()
    return result['Attributes'][ID]
  } catch (dbError) {
    const initializeExpStr = "set " + ID + " = :num";
    const params2 = {
      TableName: TABLE_NAME,
      Key: {
        [PARTITION_KEY]: NEXT_ID,
        [SORT_KEY]: COUNTER_TYPE,
      },
      UpdateExpression: initializeExpStr,
      ExpressionAttributeValues: {
        ":num": 2
      },
      ReturnValues: "UPDATED_NEW"
    };
    await db.update(params2).promise()
    return 1;
  }
}

async function createTag(tagValue: any) {
  const result = await getTagByValue(tagValue);
  if (result[ID]) {
    return result
  } else {
    const nextId = await getNextId();
    const uniqStr = "unique#" + nextId
    const item1 = {
      [PARTITION_KEY]: uniqStr,
      [SORT_KEY]: UNIQUE_TYPE,
      [VALUE]: tagValue
    };
    const params1 = {
      TableName: TABLE_NAME,
      Item: item1
    };
    await db.put(params1).promise()
    const item2 = {
      [PARTITION_KEY]: tagValue,
      [SORT_KEY]: ID_TYPE,
      [ID]: nextId,
    };
    const params2 = {
      TableName: TABLE_NAME,
      Item: item2
    };
    return db.put(params2).promise();
  }
}

async function getTagByValue(tagValue: any) {
  const params = {
    TableName: TABLE_NAME,
    Key: {
      [PARTITION_KEY]: tagValue,
      [SORT_KEY]: ID_TYPE
    }
  }
  const r1 = await db.get(params).promise();
  if (r1.Item) {
    return r1['Item'];
  } else {
    return r1
  }
}

async function getTagById(tagId: number) {
  const partitionStr = "unique#" + tagId
  const params = {
    TableName: TABLE_NAME,
    Key: {
      [PARTITION_KEY]: partitionStr,
      [SORT_KEY]: UNIQUE_TYPE
    },
  };
  const r1 = await db.get(params).promise()
  if (r1.Item) {
    const tagValue = r1['Item'][VALUE];
    return getTagByValue(tagValue);
  } else {
    return r1;
  }
}

async function getAllTags() {
  const filterExpression = [SORT_KEY] + " = :" + [SORT_KEY];
  const expressionAttributeValues = '":' + [SORT_KEY] + '" : "' + ID_TYPE + '"';
  const params = {
    TableName: TABLE_NAME,
    FilterExpression: filterExpression,
    ExpressionAttributeValues: JSON.parse(
      "{" + expressionAttributeValues + "}"
    ),
  };
  const rows = await dy.getAllScanData(db, params);
  return rows;
}

//////////////////////////////////////////////////////

export const handler = async (event: any = {}): Promise<any> => {
  if (!event.method) {
    return { statusCode: 400, body: `Error: method parameter required` };
  }

  if (event.method === "createTag") {
    if (event.tagValue) {
      try {
        const response = await createTag(event.tagValue);
        return { statusCode: 200, body: response };
      } catch (dbError) {
        return { statusCode: 500, body: JSON.stringify(dbError) };
      }
    } else {
      return { statusCode: 400, body: `Error: tagValue required` };
    }
  }

  if (event.method === "getTagByValue") {
    if (event.tagValue) {
      try {
        const response = await getTagByValue(event.tagValue);
        return { statusCode: 200, body: response };
      } catch (dbError) {
        return { statusCode: 500, body: JSON.stringify(dbError) };
      }
    } else {
      return { statusCode: 400, body: `Error: tagValue required` };
    }
  }
  
  if (event.method === "getTagById") {
    if (event.tagId) {
      try {
        const response = await getTagById(event.tagId);
        return { statusCode: 200, body: response };
      } catch (dbError) {
        return { statusCode: 500, body: JSON.stringify(dbError) };
      }
    } else {
      return { statusCode: 400, body: `Error: messageId and message required` };
    }
  }
  
  if (event.method === "getAllTags") {
    try {
      const rows = await getAllTags();
      return { statusCode: 200, body: JSON.stringify(rows) };
    } catch (dbError) {
      return { statusCode: 500, body: JSON.stringify(dbError) };
    }
  }

  return { statusCode: 400, body: `Error: valid method parameter required` };
};

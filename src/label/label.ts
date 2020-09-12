const AWS = require("aws-sdk");
const db = new AWS.DynamoDB.DocumentClient();
const TABLE_NAME = process.env.TABLE_NAME || "";
const PARTITION_KEY = process.env.PARTITION_KEY || "";
const SORT_KEY = process.env.SORT_KEY || "";
const INDEX_ATTRIBUTE = "index1";
const DESCRIPTION_ATTRIBUTE = "description";
const ORIGIN = "ORIGIN";
const DDB_MAX_BATCH = 25;

/*

Request format:

createCategory(category, description):
    {
        method: 'createCategory',
        category: category,
        description: description
    }
    
updateCategoryDescription(category, description):
    {
        method: 'updateCategoryDescription',
        category: category,
        description: description
    }
    
deleteCategory(category):
    {
        method: 'deleteCategory',
        category: category
    }
    
createLabel(category, label):
    {
        method: 'createLabel',
        category: category,
        label: label
    }
    
// NOTE: this does not change the previous assigned index
updateLabel(category, oldlabel, newlabel):
    {
        method: 'updateLabel',
        category: category,
        oldlabel: oldlabel,
        newlabel: newlabel
    }
    
getIndex(category, label):
    {
        method: 'getIndex',
        category: category,
        label: label
    }
    
listCategories():
    {
        method: 'listCategories'        
    }

listLabels(category):
    {
        method: 'listLabels',
        category: category
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

async function createCategory(category: any, description: any) {
  const item = {
    [PARTITION_KEY]: category,
    [SORT_KEY]: ORIGIN,
    [DESCRIPTION_ATTRIBUTE]: description,
  };
  const params = {
    TableName: TABLE_NAME,
    Item: item,
  };
  try {
    await db.put(params).promise();
    return { statusCode: 201, body: "" };
  } catch (dbError) {
    return { statusCode: 500, body: JSON.stringify(dbError) };
  }
}

async function updateCategoryDescription(category: any, description: any) {
  const key = {
    [PARTITION_KEY]: category,
    [SORT_KEY]: ORIGIN,
  };
  const expressionAttributeNames = '"#d" : "' + [DESCRIPTION_ATTRIBUTE] + '"';
  const expressionAttributeValues = '":d" : "' + description + '"';
  const params = {
    TableName: TABLE_NAME,
    Key: key,
    UpdateExpression: "set #d = :d",
    ExpressionAttributeNames: JSON.parse("{" + expressionAttributeNames + "}"),
    ExpressionAttributeValues: JSON.parse(
      "{" + expressionAttributeValues + "}"
    ),
  };
  try {
    await db.update(params).promise();
    return { statusCode: 201, body: "" };
  } catch (dbError) {
    return { statusCode: 500, body: JSON.stringify(dbError) };
  }
}

async function getCategoryRows(category: any) {
  const keyConditionExpression = [PARTITION_KEY] + " = :" + [PARTITION_KEY];
  const expressionAttributeValues =
    '":' + [PARTITION_KEY] + '" : "' + category + '"';
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

async function getAllCategories() {
  const filterExpression = [SORT_KEY] + " = :" + [SORT_KEY];
  const expressionAttributeValues = '":' + [SORT_KEY] + '" : "' + ORIGIN + '"';
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

async function deleteCategory(category: any) {
  try {
    let rows: any = await getCategoryRows(category);
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
    const response = "deleted " + rows.length + " items";
    return { statusCode: 200, body: response };
  } catch (dbError) {
    return { statusCode: 500, body: JSON.stringify(dbError) };
  }
}

async function createLabel(category: any, label: any) {
  const rows = await getCategoryRows(category);
  // Check if already exists
  for (let r of rows) {
    const l1 = r[SORT_KEY];
    if (l1 == label) {
      const indexResponse = { index: r[INDEX_ATTRIBUTE] };
      return { statusCode: 200, body: JSON.stringify(indexResponse) };
    }
  }
  const nextIndex = rows.length - 1;
  const item = {
    [PARTITION_KEY]: category,
    [SORT_KEY]: label,
    [INDEX_ATTRIBUTE]: nextIndex,
  };
  const params = {
    TableName: TABLE_NAME,
    Item: item,
  };
  try {
    await db.put(params).promise();
    const rv = { index: nextIndex };
    return { statusCode: 201, body: JSON.stringify(rv) };
  } catch (dbError) {
    return { statusCode: 500, body: JSON.stringify(dbError) };
  }
}

async function updateLabel(category: any, oldlabel: any, newlabel: any) {
  // First, get the index
  var updateIndex = 0;
  const indexParams = {
    TableName: TABLE_NAME,
    Key: {
      [PARTITION_KEY]: category,
      [SORT_KEY]: oldlabel,
    },
  };

  return db.get(indexParams).promise()
    .then((response: any) => {
      const oldItem = response.Item;
      updateIndex = oldItem[INDEX_ATTRIBUTE];
      // Next, delete old item
      const deleteParams = {
        TableName: TABLE_NAME,
        Key: {
          [PARTITION_KEY]: category,
          [SORT_KEY]: oldlabel,
        },
      };
      return db.delete(deleteParams).promise();
    })
    .then((response: any) => {
      // Next, create new item
      const newItem = {
        [PARTITION_KEY]: category,
        [SORT_KEY]: newlabel,
        [INDEX_ATTRIBUTE]: updateIndex,
      };
      const createParams = {
        TableName: TABLE_NAME,
        Item: newItem,
      };
      return db.put(createParams).promise(); })
    .then((response: any) => {
      return { statusCode: 200, body: JSON.stringify(response) };
    })
    .catch((error: any) => {
      return { statusCode: 500, body: JSON.stringify(error) };
    });
}

async function listLabels(category: any) {
  try {
    var l: any[] = [];
    const rows = await getCategoryRows(category);
    for (let r of rows) {
      if (!(r[SORT_KEY] == ORIGIN)) {
        l.push(r);
      }
    }
    return { statusCode: 200, body: JSON.stringify(l) };
  } catch (dbError) {
    return { statusCode: 500, body: JSON.stringify(dbError) };
  }
}

async function getIndex(category: any, label: any) {
  const params = {
    TableName: TABLE_NAME,
    Key: {
      [PARTITION_KEY]: category,
      [SORT_KEY]: label,
    },
  };
  try {
    const response = await db.get(params).promise();
    return { statusCode: 200, body: JSON.stringify(response.Item) };
  } catch (dbError) {
    return { statusCode: 500, body: JSON.stringify(dbError) };
  }
}

//////////////////////////////////////////////

export const handler = async (event: any = {}): Promise<any> => {
  if (!event.method) {
    console.log("Error: method parameter required - returning statusCode 400");
    return { statusCode: 400, body: `Error: method parameter required` };
  }

  if (event.method === "createCategory") {
    if (event.category && event.description) {
      return createCategory(event.category, event.description);
    } else {
      return {
        statusCode: 400,
        body: `Error: category and description required`,
      };
    }
  }

  if (event.method === "updateCategoryDescription") {
    if (event.category && event.description) {
      return updateCategoryDescription(event.category, event.description);
    } else {
      return {
        statusCode: 400,
        body: `Error: category and description required`,
      };
    }
  }

  if (event.method === "deleteCategory") {
    if (event.category) {
      return deleteCategory(event.category);
    } else {
      return { statusCode: 400, body: `Error: category required` };
    }
  }

  if (event.method === "createLabel") {
    if (event.category && event.label) {
      return await createLabel(event.category, event.label);
    } else {
      return { statusCode: 400, body: `Error: category and label required` };
    }
  }

  if (event.method === "listLabels") {
    if (event.category) {
      return await listLabels(event.category);
    } else {
      return { statusCode: 400, body: `Error: category` };
    }
  }

  if (event.method === "listCategories") {
    return await getAllCategories();
  }

  if (event.method === "getIndex") {
    if (event.category && event.label) {
      return await getIndex(event.category, event.label);
    } else {
      return { statusCode: 400, body: `Error: category and label required` };
    }
  }
  
  if (event.method === "updateLabel") {
    if (event.category && event.oldlabel && event.newlabel) {
      return await updateLabel(event.category, event.oldlabel, event.newlabel)
    }
  }

  return { statusCode: 400, body: `Error: valid method parameter required` };
};

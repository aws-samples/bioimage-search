const AWS = require("aws-sdk");
const db = new AWS.DynamoDB.DocumentClient();
const TABLE_NAME = process.env.TABLE_NAME || "";
const PARTITION_KEY = process.env.PARTITION_KEY || "";
const SORT_KEY = process.env.SORT_KEY || "";
const INDEX_ATTRIBUTE = "index1";
const DESCRIPTION_ATTRIBUTE = "description"
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
updateLabel(category, label):
    {
        method: 'updateLabel',
        category: category,
        label: label
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

async function createCategory(category: any, description: any) {
  const item = {
    [PARTITION_KEY]: category,
    [SORT_KEY]: ORIGIN,
    [DESCRIPTION_ATTRIBUTE]: description
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

export const handler = async (event: any = {}): Promise<any> => {
  if (!event.method) {
    console.log("Error: method parameter required - returning statusCode 400");
    return { statusCode: 400, body: `Error: method parameter required` };
  }

  if (event.method === "createCategory") {
      if (event.category && event.description) {
        return createCategory(event.category, event.description);
      } else {
        return { statusCode: 400, body: `Error: category and description required` };
      }
  }

  return { statusCode: 400, body: `Error: valid method parameter required` };
};

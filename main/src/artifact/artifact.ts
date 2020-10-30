const AWS = require("aws-sdk");
const { v4: uuidv4 } = require('uuid')
const db = new AWS.DynamoDB.DocumentClient();
const dy = require("bioimage-dynamo")
const TABLE_NAME = process.env.TABLE_NAME || "";
const PARTITION_KEY = process.env.PARTITION_KEY || "";
const SORT_KEY = process.env.SORT_KEY || "";
const LATEST = "LATEST";
const DDB_MAX_BATCH = 25;

/*
  PARTITION_KEY is compound key:
  
    <type_id>#<train_id>
    
  SORT_KEY is 's3key'

*/

const S3BUCKET_ATTRIBUTE = "s3bucket";
const CREATE_TIMESTAMP_ATTRIBUTE = "createTimestamp";
const TYPE_ATTRIBUTE = "type";
const ANNOTATION_ATTRIBUTE = "annotation";

/*
  Methods:
  
  createArtifact(typeId, trainId, s3key, s3bucket, type, annotation)
  
  getArtifacts(typeId, trainId)
  
  addAnnotation(typeId, trainId)
  
  deleteArtifact(typeId, trainId)

*/


// async function getMessage(messageId: any) {
//   const params = {
//     TableName: TABLE_NAME,
//     Key: {
//       [PARTITION_KEY]: messageId,
//       [SORT_KEY]: LATEST,
//     },
//   };
//   try {
//     const response = await db.get(params).promise();
//     return { statusCode: 200, body: JSON.stringify(response.Item) };
//   } catch (dbError) {
//     return { statusCode: 500, body: JSON.stringify(dbError) };
//   }
// }

// async function createMessage(message: any) {
//   const id = uuidv4();
//   const item = {
//     [PARTITION_KEY]: id,
//     [SORT_KEY]: LATEST,
//     [DETAIL_ATTRIBUTE]: message,
//   };
//   const itemTimestamp = {
//     [PARTITION_KEY]: id,
//     [SORT_KEY]: Date.now().toString(),
//     [DETAIL_ATTRIBUTE]: message,
//   };
//   const params = {
//     TableName: TABLE_NAME,
//     Item: item,
//   };
//   const paramsTimestamp = {
//     TableName: TABLE_NAME,
//     Item: itemTimestamp,
//   };
//   try {
//     const p: any[] = []
//     p.push(db.put(params).promise());
//     p.push(db.put(paramsTimestamp).promise());
//     await Promise.all(p)
//     const response = { messageId: id }
//     return { statusCode: 201, body: JSON.stringify(response) };
//   } catch (dbError) {
//     return { statusCode: 500, body: JSON.stringify(dbError) };
//   }
// }

// async function addMessage(messageId: any, message: any) {
//   const item = {
//     [PARTITION_KEY]: messageId,
//     [SORT_KEY]: LATEST,
//     [DETAIL_ATTRIBUTE]: message,
//   };
//   const itemTimestamp = {
//     [PARTITION_KEY]: messageId,
//     [SORT_KEY]: Date.now().toString(),
//     [DETAIL_ATTRIBUTE]: message,
//   };
//   const validationParams = {
//     TableName: TABLE_NAME,
//     Key: {
//       [PARTITION_KEY]: messageId,
//       [SORT_KEY]: LATEST,
//     },
//   };
//   const params = {
//     TableName: TABLE_NAME,
//     Item: item,
//   };
//   const paramsTimestamp = {
//     TableName: TABLE_NAME,
//     Item: itemTimestamp,
//   };
//   try {
//     const validation = await db.get(validationParams).promise();
//     if (!validation.Item[PARTITION_KEY]) {
//         return { statusCode: 400, body: 'messageId must already exist' }
//     }
//     const p: any[] = []
//     p.push(db.put(params).promise());
//     p.push(db.put(paramsTimestamp).promise());
//     await Promise.all(p)
//     const response = { messageId: messageId  }
//     return { statusCode: 201, body: JSON.stringify(response) };
//   } catch (dbError) {
//     return { statusCode: 500, body: JSON.stringify(dbError) };
//   }
// }

// async function listMessage(messageId: any) {
//   const keyConditionExpression = [PARTITION_KEY] + " = :" + [PARTITION_KEY];
//   const expressionAttributeValues =
//     '":' + [PARTITION_KEY] + '" : "' + messageId + '"';
//   const params = {
//     TableName: TABLE_NAME,
//     KeyConditionExpression: keyConditionExpression,
//     ExpressionAttributeValues: JSON.parse(
//       "{" + expressionAttributeValues + "}"
//     ),
//   };
//   const result: any = await dy.getAllQueryData(db, params);
//   return result;
// }

// async function deleteMessage(messageId: any) {
//   try {
//     let rows: any = await listMessage(messageId);
//     let p: any[] = [];
//     let i = 0;
//     while (i < rows.length) {
//       let j = i + DDB_MAX_BATCH;
//       if (j > rows.length) {
//         j = rows.length;
//       }
//       p.push(dy.deleteRows(db, PARTITION_KEY, SORT_KEY, TABLE_NAME, rows.slice(i, j)));
//       i += j - i;
//     }
//     await Promise.all(p);
//     const response = "deleted " + rows.length + " message rows";
//     return { statusCode: 200, body: response };
//   } catch (dbError) {
//     return { statusCode: 500, body: JSON.stringify(dbError) };
//   }
// }

async function createArtifact(event: any) {
}

async function getArtifacts(typeId: any, trainId: any) {
}

async function addAnnotation(typeId: any, trainId: any, annotation: any) {
}

async function deleteArtifact(typeId: any, trainId: any) {
}

/////////////////

export const handler = async (event: any = {}): Promise<any> => {
  if (!event.method) {
    return { statusCode: 400, body: `Error: method parameter required` };
  }

  // createArtifact(typeId, trainId, s3key, s3bucket, type, annotation)

  if (event.method === "createArtifact") {
    if (event.typeId && 
        event.trainId && 
        event.s3key && 
        event.s3bucket && 
        event.type) {
      return createArtifact(event);
    } else {
      return { statusCode: 400, body: `Error: missing required attributes` };
    }
  }

  // getArtifacts(typeId, trainId)

  if (event.method === "getArtifacts") {
    if (event.typeId && event.trainId) {
      return getArtifacts(event.typeId, event.trainId);
    } else {
      return { statusCode: 400, body: `Error: message required` };
    }
  }
  
  // addAnnotation(typeId, trainId)

  if (event.method === "addAnnotation") {
    if (event.typeId && event.trainId && event.annotation) {
      return addAnnotation(event.typeId, event.trainId, event.annotation);
    } else {
      return { statusCode: 400, body: `Error: messageId and message required` };
    }
  }

  // deleteArtifact(typeId, trainId)

  if (event.method === "deleteArtifact") {
    if (event.typeId && event.trainId) {
      return deleteArtifact(event.typeId, event.trainId);
    } else {
      return { statusCode: 400, body: `Error: messageId required` };
    }
  }

  return { statusCode: 400, body: `Error: valid method parameter required` };
};

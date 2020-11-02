const AWS = require("aws-sdk");
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
  
  Annotation is list 

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
  
  deleteArtifacts(typeId, trainId)

*/

async function createArtifact(artifact1: any) {
  const timestamp = Date.now().toString()
  const annotationList: any[] = []
  if(artifact1.annotation) {
    annotationList.push(artifact1.annotation)
  }
  const artifact2 = {
    [PARTITION_KEY] : `${artifact1.typeId}#${artifact1.trainId}`,
    [SORT_KEY] : artifact1.s3key,
    [S3BUCKET_ATTRIBUTE] : artifact1.s3bucket,
    [CREATE_TIMESTAMP_ATTRIBUTE] : timestamp,
    [TYPE_ATTRIBUTE] : artifact1.type,
    [ANNOTATION_ATTRIBUTE] : annotationList
  }
  const params = {
    TableName: TABLE_NAME,
    Item: artifact2
  };
  return db.put(params).promise()
}

async function getArtifacts(typeId: any, trainId: any) {
  const keyConditionExpression = [PARTITION_KEY] + " = :" + [PARTITION_KEY];
  const expressionAttributeValues =
    '":' + [PARTITION_KEY] + '" : "' + `${typeId}#${trainId}` + '"';
  const params = {
    TableName: TABLE_NAME,
    KeyConditionExpression: keyConditionExpression,
    ExpressionAttributeValues: JSON.parse(
      "{" + expressionAttributeValues + "}"),
  };
  const result = await dy.getAllQueryData(db, params);
  return result
}

async function addAnnotation(typeId: any, trainId: any, s3key: any, annotation: any) {
  const appendStr = `list_append ( ${[ANNOTATION_ATTRIBUTE]}, :val1 )`
  
  var params = {
    TableName:TABLE_NAME,
    Key:{
      [PARTITION_KEY]: `${typeId}#${trainId}`,
      [SORT_KEY]: s3key
    },
    UpdateExpression: appendStr,
    ExpressionAttributeValues: JSON.parse(
      "{" + '":val1"' +':' + '"' + annotation + '"' + "}"
      ),
    ReturnValues:"UPDATED_NEW"
  };
  
  return db.update(params).promise();
}

async function deleteArtifacts(typeId: any, trainId: any) {
  let rows: any = await getArtifacts(typeId, trainId);
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

/////////////////

export const handler = async (event: any = {}): Promise<any> => {
  if (!event.method) {
    return { statusCode: 400, body: `Error: method parameter required` };
  }

  // createArtifact(typeId, trainId, s3key, s3bucket, type, annotation)

  if (event.method === "createArtifact") {
    if (event.artifact &&
        event.artifact.typeId && 
        event.artifact.trainId && 
        event.artifact.s3key && 
        event.artifact.s3bucket && 
        event.artifact.type) {
      try {
       const response = await createArtifact(event.artifact);
        return { statusCode: 200, body: JSON.stringify(response) };
      } catch (dbError) {
        return { statusCode: 500, body: JSON.stringify(dbError) };
      }
    } else {
      return { statusCode: 400, body: `Error: missing required attributes` };
    }
  }

  // getArtifacts(typeId, trainId)

  if (event.method === "getArtifacts") {
    if (event.typeId && event.trainId) {
      try {
        const response = await getArtifacts(event.typeId, event.trainId);
        return { statusCode: 200, body: JSON.stringify(response) };
      } catch (dbError) {
        return { statusCode: 500, body: JSON.stringify(dbError) };
      }
    } else {
      return { statusCode: 400, body: `Error: message required` };
    }
  }
  
  // addAnnotation(typeId, trainId)

  if (event.method === "addAnnotation") {
    if (event.typeId && event.trainId && event.s3key && event.annotation) {
      try {
        const response = await addAnnotation(event.typeId, event.trainId, event.s3key, event.annotation);
        return { statusCode: 200, body: JSON.stringify(response) };
      } catch (dbError) {
        return { statusCode: 500, body: JSON.stringify(dbError) };
      }
    } else {
      return { statusCode: 400, body: `Error: messageId and message required` };
    }
  }

  // deleteArtifacts(typeId, trainId)

  if (event.method === "deleteArtifacts") {
    if (event.typeId && event.trainId) {
      try {
      const response = await deleteArtifacts(event.typeId, event.trainId);
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

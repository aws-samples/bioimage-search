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
const DESCRIPTION_ATTRIBUTE = "description";
const ANNOTATION_ATTRIBUTE = "annotation";

/*
  Methods:
  
  createArtifact(contextId, trainId, artifact, s3bucket, description, annotation)
  
  getArtifacts(contextId, trainId)
  
  addAnnotation(contextId, trainId, artifact)
  
  deleteArtifacts(contextId, trainId)

*/

async function createArtifact(artifact1: any) {
  const timestamp = Date.now().toString()
  const annotationList: any[] = []
  if(artifact1.annotation) {
    annotationList.push(artifact1.annotation)
  }
  const s3bucket = artifact1.s3bucket || "";
  const description = artifact1.description || "";
  const artifact2 = {
    [PARTITION_KEY] : `${artifact1.contextId}#${artifact1.trainId}`,
    [SORT_KEY] : artifact1.artifact,
    [S3BUCKET_ATTRIBUTE] : s3bucket,
    [CREATE_TIMESTAMP_ATTRIBUTE] : timestamp,
    [DESCRIPTION_ATTRIBUTE] : description,
    [ANNOTATION_ATTRIBUTE] : annotationList
  }
  const params = {
    TableName: TABLE_NAME,
    Item: artifact2
  };
  return db.put(params).promise()
}

async function getArtifacts(contextId: any, trainId: any) {
  const keyConditionExpression = [PARTITION_KEY] + " = :" + [PARTITION_KEY];
  const expressionAttributeValues =
    '":' + [PARTITION_KEY] + '" : "' + `${contextId}#${trainId}` + '"';
  const params = {
    TableName: TABLE_NAME,
    KeyConditionExpression: keyConditionExpression,
    ExpressionAttributeValues: JSON.parse(
      "{" + expressionAttributeValues + "}"),
  };
  const paramStr = JSON.stringify(params)
  const result = await dy.getAllQueryData(db, params);
  return result
}

async function addAnnotation(contextId: any, trainId: any, artifact: any, annotation: any) {
  const appendStr = `list_append ( ${[ANNOTATION_ATTRIBUTE]}, :val1 )`
  
  var params = {
    TableName:TABLE_NAME,
    Key:{
      [PARTITION_KEY]: `${contextId}#${trainId}`,
      [SORT_KEY]: artifact
    },
    UpdateExpression: appendStr,
    ExpressionAttributeValues: JSON.parse(
      "{" + '":val1"' +':' + '"' + annotation + '"' + "}"
      ),
    ReturnValues:"UPDATED_NEW"
  };
  
  return db.update(params).promise();
}

async function deleteArtifacts(contextId: any, trainId: any) {
  let rows: any = await getArtifacts(contextId, trainId);
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

  if (event.method === "createArtifact") {
    if (event.artifact &&
        event.artifact.contextId && 
        event.artifact.trainId && 
        event.artifact.artifact) {
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

  if (event.method === "getArtifacts") {
    if (event.contextId && event.trainId) {
      try {
        const response = await getArtifacts(event.contextId, event.trainId);
        return { statusCode: 200, body: JSON.stringify(response) };
      } catch (dbError) {
        return { statusCode: 500, body: JSON.stringify(dbError) };
      }
    } else {
      return { statusCode: 400, body: `Error: contextId and trainId required` };
    }
  }
  
  if (event.method === "addAnnotation") {
    if (event.contextId && event.trainId && event.artifact && event.annotation) {
      try {
        const response = await addAnnotation(event.contextId, event.trainId, event.artifact, event.annotation);
        return { statusCode: 200, body: JSON.stringify(response) };
      } catch (dbError) {
        return { statusCode: 500, body: JSON.stringify(dbError) };
      }
    } else {
      return { statusCode: 400, body: `Error: contextId, trainId, and artifact required` };
    }
  }

  if (event.method === "deleteArtifacts") {
    if (event.contextId && event.trainId) {
      try {
      const response = await deleteArtifacts(event.contextId, event.trainId);
      return { statusCode: 200, body: JSON.stringify(response) };
      } catch (dbError) {
        return { statusCode: 500, body: JSON.stringify(dbError) };
      }
    } else {
      return { statusCode: 400, body: `Error: contextId, trainId required` };
    }
  }

  return { statusCode: 400, body: `Error: valid method parameter required` };
};

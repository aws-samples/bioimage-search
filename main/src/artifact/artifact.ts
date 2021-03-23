const AWS = require("aws-sdk");
const db = new AWS.DynamoDB.DocumentClient();
const dy = require("bioimage-dynamo")
const su = require("short-uuid");
const s3 = new AWS.S3();
const cf = new AWS.CloudFormation();

const TABLE_NAME = process.env.TABLE_NAME || "";
const PARTITION_KEY = process.env.PARTITION_KEY || "";
const BUCKET = process.env.BUCKET || "";
const SORT_KEY = process.env.SORT_KEY || "";
const LATEST = "LATEST";
const DDB_MAX_BATCH = 25;


const CREATE_TIMESTAMP_ATTRIBUTE = "createTimestamp";
const DESCRIPTION_ATTRIBUTE = "description";
const ANNOTATION_ATTRIBUTE = "annotation";


async function createArtifact(artifact1: any) {
  const timestamp = Date.now().toString()
  const annotationList: any[] = []
  if(artifact1.annotation) {
    annotationList.push(artifact1.annotation)
  }
  const description = artifact1.description || "";
  const artifact2 = {
    [PARTITION_KEY] : `${artifact1.contextId}#${artifact1.trainId}`,
    [SORT_KEY] : artifact1.artifact,
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

async function createDescribeStacksArtifact(contextId: any, trainId: any) {
  let artifactId = su.generate()
  let key =`artifact/describe-stacks/${contextId}/stacks-${artifactId}.json`
  
  var cfParams = {}
  const dsResult = await cf.describeStacks(cfParams).promise();

  let dsResultStr = JSON.stringify(dsResult);
  var buffer = Buffer.from(dsResultStr);
  
  var s3PutParams = {
    Bucket: BUCKET,
    Key: key,
    Body: buffer
  }
  await s3.putObject(s3PutParams).promise();

  let artifactKey = `s3key#${key}`;
  let a = {
    contextId: contextId,
    trainId: trainId,
    artifact: artifactKey
  }
  await createArtifact(a);

  let r = {
    contextId: contextId,
    trainId: trainId,
    key: key
  }
  return r
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
       console.log("Created artifact=")
       console.log(event.artifact)
       console.log("==")
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
  
  if (event.method === "createDescribeStacksArtifact") {
    if (event.contextId && event.trainId) {
      try {
      const response = await createDescribeStacksArtifact(event.contextId, event.trainId);
      return { statusCode: 200, body: response };
      } catch (dbError) {
        return { statusCode: 500, body: JSON.stringify(dbError) };
      }
    } else {
      return { statusCode: 400, body: `Error: contextId, trainId required` };
    }
  }

  return { statusCode: 400, body: `Error: valid method parameter required` };
};

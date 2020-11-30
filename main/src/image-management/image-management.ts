const AWS = require("aws-sdk");
const s3 = new AWS.S3({ apiVersion: "2006-03-01" });
const lambda = new AWS.Lambda({ apiVersion: "2015-03-31" });
const db = new AWS.DynamoDB.DocumentClient();
const dy = require("bioimage-dynamo");
const la = require("bioimage-lambda");
const su = require("short-uuid");

const TABLE_NAME = process.env.TABLE_NAME || "";
const PARTITION_KEY_IMGID = process.env.PARTITION_KEY || "";
const SORT_KEY_TRNID = process.env.SORT_KEY || "";
const PLATE_INDEX = process.env.PLATE_INDEX || "";
const TRAINING_CONFIGURATION_LAMBDA_ARN = process.env.TRAINING_CONFIGURATION_LAMBDA_ARN || "";
const MESSAGE_LAMBDA_ARN = process.env.MESSAGE_LAMBDA_ARN || "";
const ARTIFACT_LAMBDA_ARN = process.env.ARTIFACT_LAMBDA_ARN || "";

//const PROCESS_PLATE_SFN = process.env.PROCESS_PLATE_SFN || "";

const LATEST = "LATEST";
const DDB_MAX_BATCH = 25;
const ORIGIN = "origin";

const PLATE_ID_ATTRIBUTE = "plateId";
const WELL_ID_ATTRIBUTE = "wellId";
const PLATE_SOURCE_ID_ATTRIBUTE = "plateSourceId";
const WELL_SOURCE_ID_ATTRIBUTE = "wellSourceId";
const IMAGE_SOURCE_ID_ATTRIBUTE = "imageSourceId";
const CREATE_TIMESTAMP_ATTRIBUTE = "createTimestamp";
const SEARCH_READY_ATTRIBUTE = "searchReady";
const MESSAGE_ID_ATTRIBUTE = "messageId";
const TRAIN_CATEGORY_ATTRIBUTE = "trainCategory";
const TRAIN_LABEL_ATTRIBUTE = "trainLabel";
const EXPERIMENT_ATTRIBUTE = "experiment";
const EMBEDDING_ATTRIBUTE = "embedding";
const HEIGHT_ATTRIBUTE = "height";
const WIDTH_ATTRIBUTE = "width";
const DEPTH_ATTRIBUTE = "depth";
const CHANNELS_ATTRIBUTE = "channels";
const BUCKET_ATTRIBUTE = "bucket";
const KEY_ATTRIBUTE = "key";
const CHANNEL_KEYS_ATTRIBUTE = "channelKeys";
const TAG_ARRAY_ATTRIBUTE = "tagArr";
const ROI_ARRAY_ATTRIBUTE = "roiArr";
const ROI_EMBEDDING_ARRAY_ATTRIBUTE = "roiEmbeddingArr";

/*
  * Search Ready { PREVALIDATION, VALIDATED, ERROR, READY }
      * PREVALIDATION =  before the image files have. been checked to match the embedding requirements
      * VALIDATED = image dimensions match embedding
      * ERROR = the images are not usable, possible due to format, dimensions, etc.
      * READY = ready for search
*/            

const SR_UNDEFINED = "UNDEFINED"
const SR_PREVALIDATION = "PREVALIDATION"
const SR_VALIDATED = "VALIDATED"
const SR_ERROR = "ERROR"
const SR_READY = "READY"

/*

  SourcePlateInfo {
     trainId: <string>
     plateSourceId: <string>
     images: [
       wellSourceId: <string>
       imageSourceId: <string>
       sourceBucket: <string>a
       sourceKey: <string>
       channelKeys: [{ channel:<name>, keysuffix:<suffix> }] - optional
       category: <string - optional>
       label: <string - optional>
       experiment: <string - optional>
     ]
   }

*/

/////////////////////////////////////////////////

async function createPlateMessageId(plateId: any) {
  const plateMessageId = await createMessage(`Message START for plateId ${plateId}`);

  const partitionKey = 'plate#' + plateId
  const key = {
    [PARTITION_KEY_IMGID]: partitionKey,
    [SORT_KEY_TRNID]: ORIGIN,
  };
  const expressionAttributeNames = '"#m" : "' + [MESSAGE_ID_ATTRIBUTE] + '"'
  const expressionAttributeValues = '":m" : "' + plateMessageId + '"'
  const updateExpression = "set #m = :m"
  const namesParse = "{" + expressionAttributeNames + "}"
  const valuesParse = "{" + expressionAttributeValues + "}"
  
  const params = {
    TableName: TABLE_NAME,
    Key: key,
    UpdateExpression: updateExpression,
    ExpressionAttributeNames: JSON.parse(namesParse),
    ExpressionAttributeValues: JSON.parse(valuesParse)
  };
  console.log(params)
  return await db.update(params).promise();

  // const artifact = {
  //   "contextId" : plateId,
  //   "trainId" : ORIGIN,
  //   "artifact" : `messageId#${plateMessageId}`
  // }
  // var params = {
  //   FunctionName: ARTIFACT_LAMBDA_ARN,
  //   InvocationType: "RequestResponse",
  //   Payload: JSON.stringify({ method: "createArtifact", artifact: artifact }),
  // };
  // await lambda.invoke(params).promise();

  return plateMessageId
}

async function getPlateMessageId(plateId: any) {

  
  // var params = {
  //   FunctionName: ARTIFACT_LAMBDA_ARN,
  //   InvocationType: "RequestResponse",
  //   Payload: JSON.stringify({ method: "getArtifacts", contextId: plateId, trainId: ORIGIN })
  // };
  // const response = await lambda.invoke(params).promise();
  // const rows = la.getResponseBody(response)
  // for (let r of rows) {
  //   const a = r.artifact
  //   if (a.startsWith('messageId#')) {
  //     const ac = a.split('#')
  //     const messageId= ac[1]
  //     return messageId
  //   }
  // }
  // const errMsg = `No messageId found for plate ${plateId}`;
  // throw new Error(errMsg)

  const partitionKey = 'plate#' + plateId;
  const params = {
    TableName: TABLE_NAME,
    Key: {
      [PARTITION_KEY_IMGID]: partitionKey,
      [SORT_KEY_TRNID]: ORIGIN,
    },
  };
  const row = db.get(params).promise();
  if ('Item' in row) {
    if (MESSAGE_ID_ATTRIBUTE in row['Item']) {
      return row['Item'][MESSAGE_ID_ATTRIBUTE]
    }
  }
  throw new Error("MessageID not found for plateId=" + plateId)
}

async function createMessage(message: any) {
  var params = {
    FunctionName: MESSAGE_LAMBDA_ARN,
    InvocationType: "RequestResponse",
    Payload: JSON.stringify({ method: "createMessage", message: message }),
  };
  const data = await lambda.invoke(params).promise();
  const createMessageResponse = la.getResponseBody(data);
  const messageId = createMessageResponse["messageId"];
  return messageId;
}

async function getTrainInfo(trainId: any) {
  var params = {
    FunctionName: TRAINING_CONFIGURATION_LAMBDA_ARN,
    InvocationType: "RequestResponse",
    Payload: JSON.stringify({ method: "getTraining", train_id: trainId }),
  };
  const data = await lambda.invoke(params).promise();
  const trainInfoResponse = la.getResponseBody(data);
  return trainInfoResponse["Item"];
}

async function validateTrainId(trainId: any) {
  const trainInfo: any = await getTrainInfo(trainId);
  if (!trainInfo) {
    throw new Error(`trainInfo not available for trainId=${trainId}}`);
  }
  if (!(trainInfo.train_id == trainId)) {
    const errMsg = `trainId=${trainId} does not match ${trainInfo.train_id}`;
    throw new Error(errMsg);
  }
  return trainInfo;
}

// This function validates the TrainId, and then adds 'origin' information from
// the SourcePlateInfo data. It then hands off processing to the 'ProcessPlate' StepFunction.

async function populateSourcePlate(inputBucket: any, inputKey: any) {
  const data = await s3
    .getObject({ Bucket: inputBucket, Key: inputKey })
    .promise();
  if (!data) {
    throw new Error("sourcePlateInfo object null");
  }
  const sourcePlateInfoStr = data.Body.toString("utf-8");
  const sourcePlateInfo = JSON.parse(sourcePlateInfoStr);

  // NOTE: trainId no longer permitted - all uploads are 'origin'
  //
  // if (!("trainId" in sourcePlateInfo)) {
  //   throw new Error("trainId required");
  // }
  // const trainId = sourcePlateInfo["trainId"];
  // if (trainId != ORIGIN) {
  //   const trainInfo = validateTrainId(trainId);
  //   if (!("plateSourceId" in sourcePlateInfo)) {
  //     throw new Error("plateSourceId required");
  //   }
  // }
  
  const plateSourceId = sourcePlateInfo["plateSourceId"];
  if (!("images" in sourcePlateInfo)) {
    throw new Error("images required");
  }
  const plateId = su.generate();
  const plateKey = 'plate#' + plateId;
  const plateEntry = {
    [PARTITION_KEY_IMGID]: plateKey,
    [SORT_KEY_TRNID]: ORIGIN
  }
  const params = {
    TableName: TABLE_NAME,
    Item: plateEntry,
  };
  await db.put(params).promise();
  const plateMessageId = await createPlateMessageId(plateId)
  console.log("plateMessageId=")
  console.log(plateMessageId)

  const images: any[] = sourcePlateInfo["images"];
  const wellDict: Map<string, string> = new Map();
  const fields: any[] = [
    "wellSourceId",
    "imageSourceId",
    "sourceBucket",
    "sourceKey",
  ];
  const timestamp = Date.now().toString();
  const p: any[] = [];
  for (const image of images) {
    const imageId = su.generate();
    for (const field of fields) {
      if (!(field in image)) {
        throw new Error(
          `field ${field} required in sourcePlateId ${plateSourceId}`
        );
      }
    }
    const wellSourceId = image["wellSourceId"];
    const imageSourceId = image["imageSourceId"];
    const sourceBucket = image["sourceBucket"];
    const sourceKey = image["sourceKey"];
    var wellId: string = "";
    if (wellSourceId in wellDict) {
      wellId = wellDict.get(wellSourceId)!;
    } else {
      wellId = su.generate();
      wellDict.set(wellSourceId, wellId);
    }
    const messageId = await createMessage(`Creation of imageId=${imageId}`);
    const imageEntry = {
      [PARTITION_KEY_IMGID]: imageId,
      [SORT_KEY_TRNID]: ORIGIN,
      [PLATE_ID_ATTRIBUTE]: plateId,
      [WELL_ID_ATTRIBUTE]: wellId,
      [PLATE_SOURCE_ID_ATTRIBUTE]: plateSourceId,
      [WELL_SOURCE_ID_ATTRIBUTE]: wellSourceId,
      [IMAGE_SOURCE_ID_ATTRIBUTE]: imageSourceId,
      [CREATE_TIMESTAMP_ATTRIBUTE]: timestamp,
      [MESSAGE_ID_ATTRIBUTE]: messageId,
      [BUCKET_ATTRIBUTE]: sourceBucket,
      [KEY_ATTRIBUTE]: sourceKey,
      ...("channelKeys" in image && {
        [CHANNEL_KEYS_ATTRIBUTE]: image["channelKeys"],
      }),
      ...("category" in image && {
        [TRAIN_CATEGORY_ATTRIBUTE]: image["category"],
      }),
      ...("label" in image && { [TRAIN_LABEL_ATTRIBUTE]: image["label"] }),
      ...("experiment" in image && {
        [EXPERIMENT_ATTRIBUTE]: image["experiment"],
      }),
    };
    const params = {
      TableName: TABLE_NAME,
      Item: imageEntry,
    };
    p.push(db.put(params).promise());
  }
  await Promise.all(p);
  return { plateId: plateId };
}

async function getImageRow(imageId: any, trainId: any) {
  const params = {
    TableName: TABLE_NAME,
    Key: {
      [PARTITION_KEY_IMGID]: imageId,
      [SORT_KEY_TRNID]: trainId,
    },
  };
  return db.get(params).promise();
}

async function getImagesByPlateId(plateId: any) {
  const keyConditionExpression =
    [PLATE_ID_ATTRIBUTE] + " = :" + [PLATE_ID_ATTRIBUTE];
  const expressionAttributeValues =
    '":' + [PLATE_ID_ATTRIBUTE] + '" : "' + plateId + '"';
  const params = {
    TableName: TABLE_NAME,
    IndexName: PLATE_INDEX,
    KeyConditionExpression: keyConditionExpression,
    ExpressionAttributeValues: JSON.parse(
      "{" + expressionAttributeValues + "}"
    ),
  };
  const imageRowInfo: any[] = await dy.getAllQueryData(db, params);
  let rows: any[] = [];
  const p: any[] = [];
  for (let ir of imageRowInfo) {
    p.push(
      getImageRow(
        ir[PARTITION_KEY_IMGID],
        ir[SORT_KEY_TRNID]
      ).then((result: any) => rows.push(result))
    );
  }
  await Promise.all(p);
  return rows
}

//  inspectionResult = { "imageId" : imageId, "valid" : True, "width" : dims[0], "height" : dims[1], "depth" : dims[2], "channels" : numChannels }

async function applyInspectionResult(inspectionResult: any) {
  var searchReady = SR_PREVALIDATION
  if (inspectionResult.valid) {
    searchReady = SR_VALIDATED
  } else {
    searchReady = SR_ERROR
  }
  const key = {
    [PARTITION_KEY_IMGID]: inspectionResult.imageId,
    [SORT_KEY_TRNID]: ORIGIN,
  };
  const expressionAttributeNames = '"#r" : "' + [SEARCH_READY_ATTRIBUTE] + '",' +
                                   '"#w" : "' + [WIDTH_ATTRIBUTE]        + '",' +
                                   '"#h" : "' + [HEIGHT_ATTRIBUTE]       + '",' +
                                   '"#d" : "' + [DEPTH_ATTRIBUTE]        + '",' +
                                   '"#c" : "' + [CHANNELS_ATTRIBUTE]     + '"'
                                   
  const expressionAttributeValues = '":r" : "' + searchReady               + '",' +
                                    '":w" : "' + inspectionResult.width    + '",' +
                                    '":h" : "' + inspectionResult.height   + '",' +
                                    '":d" : "' + inspectionResult.depth    + '",' +
                                    '":c" : "' + inspectionResult.channels + '"'
                                    
  const updateExpression = "set #r = :r, " +
                               "#w = :w, " +
                               "#h = :h, " +
                               "#d = :d, " +
                               "#c = :c"

  const namesParse = "{" + expressionAttributeNames + "}"
  const valuesParse = "{" + expressionAttributeValues + "}"
  
  const params = {
    TableName: TABLE_NAME,
    Key: key,
    UpdateExpression: updateExpression,
    ExpressionAttributeNames: JSON.parse(namesParse),
    ExpressionAttributeValues: JSON.parse(valuesParse)
  };
  console.log(params)
  return await db.update(params).promise();
}

// const SR_UNDEFINED = "UNDEFINED"
// const SR_PREVALIDATION = "PREVALIDATION"
// const SR_VALIDATED = "VALIDATED"
// const SR_ERROR = "ERROR"
// const SR_READY = "READY"

async function getPlateImageStatus(plateId: any) {
  
  const images = await getImagesByPlateId(plateId)
  
  let undefinedCount=0
  let prevalidationCount=0
  let validatedCount=0
  let errorCount=0
  let readyCount=0

  for (let item of images) {
    const image = item['Item']
    if(!image.searchReady) {
      undefinedCount += 1;
    } else if (image.searchReady == SR_PREVALIDATION) {
      prevalidationCount += 1;
    } else if (image.searchReady == SR_VALIDATED) {
      validatedCount += 1;
    } else if (image.searchReady == SR_ERROR) {
      errorCount += 1;
    } else if (image.searchReady == SR_READY) {
      readyCount += 1;
    } else {
      undefinedCount += 1;
    }
  }
  
  return {
    [SR_UNDEFINED] : undefinedCount,
    [SR_PREVALIDATION] : prevalidationCount,
    [SR_VALIDATED] : validatedCount,
    [SR_ERROR] : errorCount,
    [SR_READY] : readyCount
  }
}

async function updatePlateStatus(plateId: any,
  status: any,
  width: any,
  height: any,
  depth: any,
  channels: any) {
  
  const partitionKey = 'plate#' + plateId
  const key = {
    [PARTITION_KEY_IMGID]: partitionKey,
    [SORT_KEY_TRNID]: ORIGIN,
  };
  const expressionAttributeNames = '"#r" : "' + [SEARCH_READY_ATTRIBUTE] + '",' +
                                   '"#w" : "' + [WIDTH_ATTRIBUTE]        + '",' +
                                   '"#h" : "' + [HEIGHT_ATTRIBUTE]       + '",' +
                                   '"#d" : "' + [DEPTH_ATTRIBUTE]        + '",' +
                                   '"#c" : "' + [CHANNELS_ATTRIBUTE]     + '"'
                                   
  const expressionAttributeValues = '":r" : "' + status               + '",' +
                                    '":w" : "' + width    + '",' +
                                    '":h" : "' + height   + '",' +
                                    '":d" : "' + depth    + '",' +
                                    '":c" : "' + channels + '"'
                                    
  const updateExpression = "set #r = :r, " +
                               "#w = :w, " +
                               "#h = :h, " +
                               "#d = :d, " +
                               "#c = :c"

  const namesParse = "{" + expressionAttributeNames + "}"
  const valuesParse = "{" + expressionAttributeValues + "}"
  
  const params = {
    TableName: TABLE_NAME,
    Key: key,
    UpdateExpression: updateExpression,
    ExpressionAttributeNames: JSON.parse(namesParse),
    ExpressionAttributeValues: JSON.parse(valuesParse)
  };
  console.log(params)
  return await db.update(params).promise();
}

async function validatePlate(plateId: any) {
  const plateImageStatus = await getPlateImageStatus(plateId);

  let plateStatus = SR_UNDEFINED;
  if (plateImageStatus[SR_ERROR]>0) {
    plateStatus = SR_ERROR;
  } else if (plateImageStatus[SR_UNDEFINED]>0) {
    plateStatus = SR_UNDEFINED;
  } else if (plateImageStatus[SR_PREVALIDATION]>0) {
    plateStatus = SR_PREVALIDATION;
  } else if (plateImageStatus[SR_VALIDATED]>0) {
    plateStatus = SR_VALIDATED;
  } else if (plateImageStatus[SR_READY]>0) {
    plateStatus = SR_READY;
  }
  
  let height = 0
  let width = 0
  let depth = 0
  let channels = 0
    
  if (plateStatus==SR_VALIDATED || plateStatus==SR_READY) {
    const images = await getImagesByPlateId(plateId);
    let count = 0
    for (let item of images) {
      const image = item['Item']
      if (count==0) {
        height = image[HEIGHT_ATTRIBUTE]
        width = image[WIDTH_ATTRIBUTE]
        depth = image[DEPTH_ATTRIBUTE]
        channels = image[CHANNELS_ATTRIBUTE]
      } else {
        if (!(height==image[HEIGHT_ATTRIBUTE] &&
              width==image[WIDTH_ATTRIBUTE] &&
              depth==image[DEPTH_ATTRIBUTE] &&
              channels==image[CHANNELS_ATTRIBUTE])) {
                break;
              }
      }
      count += 1
    }
    if (count==images.length && height>0 && width>0 && depth>0 && channels>0) {
      plateStatus=SR_VALIDATED;
    }
  }
  
  return await updatePlateStatus(plateId, plateStatus, width, height, depth, channels);
}

/////////////////////////////////////////////////

export const handler = async (event: any = {}): Promise<any> => {
  
  if (!event.method) {
    console.log("Error: method parameter required - returning status code 400");
    return { statusCode: 400, body: `Error: method parameter required` };
  }
  
  if (event.method === "populateSourcePlate") {
    if (event.inputBucket && event.inputKey) {
      try {
        const response = await populateSourcePlate(
          event.inputBucket,
          event.inputKey
        );
        return { statusCode: 200, body: JSON.stringify(response) };
      } catch (dbError) {
        return { statusCode: 500, body: JSON.stringify(dbError) };
      }
    } else {
      return {
        statusCode: 400,
        body: `Error: embedding required`,
      };
    }
  }

  else if (event.method === "getImagesByPlateId") {
    if (event.plateId) {
      try {
        const response = await getImagesByPlateId(event.plateId);
        return { statusCode: 200, body: response };
      } catch (dbError) {
        return { statusCode: 500, body: JSON.stringify(dbError) };
      }
    }
  }

  else if (event.method === "applyInspectionResult") {
    if (event.inspectionResult) {
      try {
        const response = await applyInspectionResult(event.inspectionResult);
        return { statusCode: 200, body: response };
      } catch (dbError) {
        console.log("dbError="+dbError)
        return { statusCode: 500, body: JSON.stringify(dbError) };
      }
    } else {
      return {
        statusCode: 400,
        body: `Error: inspectionResult required`,
      };
    }
  } 
  
  else if (event.method === "getPlateImageStatus") {
    if (event.plateId) {
      try {
        const response = await getPlateImageStatus(event.plateId);
        return { statusCode: 200, body: response };
      } catch (dbError) {
        return { statusCode: 500, body: JSON.stringify(dbError) };
      }
    } else {
      return {
        statusCode: 400,
        body: `Error: plateId required`,
      };
    }
  }
  
  else if (event.method === "createPlateMessageId") {
    if (event.plateId) {
      try {
        const response = await createPlateMessageId(event.plateId);
        return { statusCode: 200, body: response };
      } catch (dbError) {
        return { statusCode: 500, body: JSON.stringify(dbError) };
      }
    } else {
      return {
        statusCode: 400,
        body: `Error: plateId required`,
      };
    }
  }
  
  else if (event.method === "getPlateMessageId") {
    if (event.plateId) {
      try {
        const response = await getPlateMessageId(event.plateId);
        return { statusCode: 200, body: response };
      } catch (dbError) {
        return { statusCode: 500, body: JSON.stringify(dbError) };
      }
    } else {
      return {
        statusCode: 400,
        body: `Error: plateId required`,
      };
    }
  }
  
  else if (event.method === "validatePlate") {
    if (event.plateId) {
      try {
        const response = await validatePlate(event.plateId);
        return { statusCode: 200, body: response };
      } catch (dbError) {
        return { statusCode: 500, body: JSON.stringify(dbError) };
      }
    } else {
      return {
        statusCode: 400,
        body: `Error: plateId required`,
      };
    }
  }

  else {
    return {
      statusCode: 400,
      body: `Do not recognize method type ${event.method}`,
    };
  }
  
};

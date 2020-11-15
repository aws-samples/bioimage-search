const AWS = require("aws-sdk");
const s3 = new AWS.S3({apiVersion: '2006-03-01'});
const lambda = new AWS.Lambda({apiVersion: '2015-03-31'});
const db = new AWS.DynamoDB.DocumentClient();
const dy = require("bioimage-dynamo");
const la = require("bioimage-lambda");
const su = require("short-uuid")

const TABLE_NAME = process.env.TABLE_NAME || "";
const PARTITION_KEY_IMGID = process.env.PARTITION_KEY || "";
const SORT_KEY_TRNID = process.env.SORT_KEY || "";
const PLATE_INDEX = process.env.PLATE_INDEX || "";
const TRAINING_CONFIGURATION_LAMBDA_ARN = process.env.TRAINING_CONFIGURATION_LAMBDA_ARN || "";
const MESSAGE_LAMBDA_ARN = process.env.MESSAGE_LAMBDA_ARN || "";

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
const CHANNEL_KEYS_ATTRIBUTE = "channelKeys"
const TAG_ARRAY_ATTRIBUTE = "tagArr";
const ROI_ARRAY_ATTRIBUTE = "roiArr";
const ROI_EMBEDDING_ARRAY_ATTRIBUTE = "roiEmbeddingArr";

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

async function createMessage(message: any) {
  var params = {
    FunctionName: MESSAGE_LAMBDA_ARN,
    InvocationType: "RequestResponse",
    Payload: JSON.stringify({ "method": "createMessage", "message" : message })
  };
  const data = await lambda.invoke(params).promise();
  const createMessageResponse = la.getResponseBody(data);
  const messageId = createMessageResponse['messageId']
  return messageId
}

async function getTrainInfo(trainId: any) {
  var params = {
    FunctionName: TRAINING_CONFIGURATION_LAMBDA_ARN, 
    InvocationType: "RequestResponse", 
    Payload: JSON.stringify({ "method": "getTraining", "train_id": trainId })
  };
  const data = await lambda.invoke(params).promise();
  const trainInfoResponse =  la.getResponseBody(data)
  return trainInfoResponse['Item']
}

async function validateTrainId(trainId: any) {
  const trainInfo: any = await getTrainInfo(trainId);
  if (!trainInfo) {
    throw new Error(`trainInfo not available for trainId=${trainId}}`)
  }
  if (!(trainInfo.train_id == trainId)) {
    const errMsg = `trainId=${trainId} does not match ${trainInfo.train_id}`
    throw new Error(errMsg)
  }
  return trainInfo
}

// This function validates the TrainId, and then adds 'origin' information from
// the SourcePlateInfo data. It then hands off processing to the 'ProcessPlate' StepFunction.

async function uploadSourcePlate(inputBucket: any, inputKey: any) {
  const data = await s3.getObject({ Bucket: inputBucket, Key: inputKey}).promise();
  if (!data) {
    throw new Error("sourcePlateInfo object null")
  }
  const sourcePlateInfoStr = data.Body.toString('utf-8');
  const sourcePlateInfo = JSON.parse(sourcePlateInfoStr)
  if (!('trainId' in sourcePlateInfo)) {
    throw new Error("trainId required")
  }
  const trainId = sourcePlateInfo['trainId']    
  const trainInfo = validateTrainId(trainId)
  if (!('plateSourceId' in sourcePlateInfo)) {
    throw new Error("plateSourceId required")
  }
  const plateSourceId = sourcePlateInfo['plateSourceId']
  if (!('images' in sourcePlateInfo)) {
    throw new Error("images required")
  }
  const plateId = su.generate()
  const images: any[] = sourcePlateInfo['images']
  const wellDict: Map<string,string> = new Map();
  const fields: any[] = ['wellSourceId', 'imageSourceId', 'sourceBucket', 'sourceKey']
  const timestamp = Date.now().toString()
  const p: any[] = []
  for (const image of images) {
    const imageId = su.generate()
    for (const field of fields) {
      if (!(field in image)) {
        throw new Error(`field ${field} required in sourcePlateId ${plateSourceId}`)
      }
    }
    const wellSourceId = image['wellSourceId']
    const imageSourceId = image['imageSourceId']
    const sourceBucket = image['sourceBucket']
    const sourceKey = image['sourceKey']
    var wellId:string = ""
    if (wellSourceId in wellDict) {
      wellId = wellDict.get(wellSourceId)!
    } else {
      wellId = su.generate()
      wellDict.set(wellSourceId, wellId)
    }
    const messageId = await createMessage(`Creation of imageId=${imageId}`)
    const imageEntry = {
      [PARTITION_KEY_IMGID] : imageId,
      [SORT_KEY_TRNID] : ORIGIN,
      [PLATE_ID_ATTRIBUTE] : plateId,
      [WELL_ID_ATTRIBUTE] : wellId,
      [PLATE_SOURCE_ID_ATTRIBUTE] : plateSourceId,
      [WELL_SOURCE_ID_ATTRIBUTE] : wellSourceId,
      [IMAGE_SOURCE_ID_ATTRIBUTE] : imageSourceId,
      [CREATE_TIMESTAMP_ATTRIBUTE] : timestamp,
      [MESSAGE_ID_ATTRIBUTE] : messageId,
      [BUCKET_ATTRIBUTE] : sourceBucket,
      [KEY_ATTRIBUTE] : sourceKey,
      ...('channelKeys' in image) && { [CHANNEL_KEYS_ATTRIBUTE] : image['channelKeys'] },
      ...('category' in image) && { [TRAIN_CATEGORY_ATTRIBUTE] : image['category'] },
      ...('label' in image) && { [TRAIN_LABEL_ATTRIBUTE] : image['label'] },
      ...('experiment' in image) && { [EXPERIMENT_ATTRIBUTE] : image['experiment'] }
    }
    const params = {
      TableName: TABLE_NAME,
      Item: imageEntry,
    };
    p.push(db.put(params).promise());
  }
  await Promise.all(p)

//   const sfnName = plateId + '-' + su.generate()
//   var processPlateSfnParams = {
//     stateMachineArn: PROCESS_PLATE_SFN,
//     input: { "plateId" : plateId },
//     name: sfnName,
// //    traceHeader: 'STRING_VALUE'
//   };
//   await sfn.startExecution(processPlateSfnParams).promise();

  return { "plateId" : plateId }
}

async function getImageRow(imageId: any, trainId: any) {
  const params = {
    TableName: TABLE_NAME,
    Key: {
      [PARTITION_KEY_IMGID]: imageId,
      [SORT_KEY_TRNID]: trainId
    },
  };
  return db.get(params).promise();
}

async function getImagesByPlateId(plateId: any) {
  const keyConditionExpression = [PLATE_ID_ATTRIBUTE] + " = :" + [PLATE_ID_ATTRIBUTE];
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
  let rows: any[] = []
  const p: any[] = []
  for (let ir of imageRowInfo) {
    p.push((getImageRow(ir[PARTITION_KEY_IMGID], ir[SORT_KEY_TRNID]).then( (result:any) => (rows.push(result)))))
  }
  await Promise.all(p)
  return rows;
}

/////////////////////////////////////////////////

export const handler = async (event: any = {}): Promise<any> => {

  if (!event.method) {
    console.log("Error: method parameter required - returning status code 400");
    return { statusCode: 400, body: `Error: method parameter required` };
  }

  if (event.method === "uploadSourcePlate") {
    if (event.inputBucket && event.inputKey) {
      try {
        const response = await uploadSourcePlate(event.inputBucket, event.inputKey);
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
  
  if (event.method === "getImagesByPlateId") {
    if (event.plateId) {
      try {
        const response = await getImagesByPlateId(event.plateId);
//        return { statusCode: 200, body: JSON.stringify(response) };
        return { statusCode: 200, body: response };
      } catch (dbError) {
        return { statusCode: 500, body: JSON.stringify(dbError) };
      }
    }
  }
  
  else {
    return { statusCode: 400, body: `Do not recognize method type ${event.method}` }
  }

};
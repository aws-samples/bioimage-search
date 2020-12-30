const AWS = require("aws-sdk");
const lambda = new AWS.Lambda({ apiVersion: "2015-03-31" });
const sfn = new AWS.StepFunctions();
const la = require("bioimage-lambda");
const su = require("short-uuid");

const MESSAGE_LAMBDA_ARN = process.env.MESSAGE_LAMBDA_ARN || "";
const IMAGE_MANAGEMENT_LAMBDA_ARN = process.env.IMAGE_MANAGEMENT_LAMBDA_ARN || "";
const TRAIN_CONFIGURATION_LAMBDA_ARN = process.env.TRAIN_CONFIGURATION_LAMBDA_ARN || "";
const TRAIN_SFN_ARN = process.env.TRAIN_SFN_ARN || "";
const TRAIN_BUILD_LAMBDA_ARN = process.env.TRAIN_BUILD_LAMBDA || ""

async function startTraining(trainId: any) {
  const executionName = "Train-" + trainId + "-" + su.generate();
  const inputStr = `{ "trainId" : \"${trainId}\" }`;
  console.log("inputStr=", inputStr);
  var params = {
    stateMachineArn: TRAIN_SFN_ARN,
    input: inputStr,
    name: executionName,
  };
  console.log("startTrain params=");
  console.log(params);
  const response = await sfn.startExecution(params).promise();
  return response;
}

async function validateEmbeddingName(embeddingName: string) {
    var params = {
    FunctionName: TRAIN_CONFIGURATION_LAMBDA_ARN,
    InvocationType: "RequestResponse",
    Payload: JSON.stringify({
      method: "getEmbeddingInfo",
      embeddingName: embeddingName
    }),
  };
  console.log("validateEmbeddingName params=");
  console.log(params);
  const data = await lambda.invoke(params).promise();
  const response = la.getResponseBody(data);
  if ('Item' in response) {
    if ('embeddingName' in response['Item']) {
      if (response['Item']['embeddingName'] == embeddingName) {
        return true
      }
    }
  }
  return false;
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

async function createTraining(training: any) {
  var params = {
    FunctionName: TRAIN_CONFIGURATION_LAMBDA_ARN,
    InvocationType: "RequestResponse",
    Payload: JSON.stringify({ method: "createTraining", training: training }),
  };
  const data = await lambda.invoke(params).promise();
  return la.getResponseBody(data);
}

async function startTrainingBuild(trainId: any) {
  var params = {
    FunctionName: TRAIN_BUILD_LAMBDA_ARN,
    InvocationType: "Event",
    Payload: JSON.stringify({ trainId: trainId}),
  };
  const data = await lambda.invoke(params).promise();
  return la.getResponseBody(data);
}

/////////////////////////////////////////////////

export const handler = async (event: any = {}): Promise<any> => {
  
  if (!event.method) {
    console.log("Error: method parameter required - returning status code 400");
    return { statusCode: 400, body: `Error: method parameter required` };
  }

  if (event.method === "train") {
    if (event.embeddingName) {
      try {
        const validEmbedding = await validateEmbeddingName(event.embeddingName);
        if (!validEmbedding) {
          const errMsg = `Embedding ${event.embeddingName} is not valid`;
          console.log(errMsg)
          throw new Error(errMsg)
        }
        const trainId = su.generate();
        const messageId = await createMessage(`Begin messages for trainid=${trainId}`);
        const filterBucket = event.filterBucket || "";
        const filterKey = event.filterKey || "";
        const training = {
          "embeddingName" : event.embeddingName,
          "trainId" : trainId,
          "messageId" : messageId,
          "filterBucket" : filterBucket,
          "filterKey" : filterKey
        }
        const trainingResponse = await createTraining(training);
        const response = await startTraining(trainId);
        return { statusCode: 200, body: JSON.stringify(response) };
      } catch (error) {
        console.log("Error=");
        console.log(error)
        return { statusCode: 500, body: JSON.stringify(error) };
      }
    } else {
      return {
        statusCode: 400,
        body: `Error: embeddingName required`,
      };
    }
  }
  else if (event.method === "startTrainingBuild") {
    if (event.trainId) {
      try {
        const response = await startTrainingBuild(event.trainId)
        return { statusCode: 200, body: response };
      } catch (error) {
        console.log("Error=");
        console.log(error)
        return { statusCode: 500, body: JSON.stringify(error) };
      }
    } else {
      return {
        statusCode: 400,
        body: `Error: trainId required`,
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

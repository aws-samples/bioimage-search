const AWS = require("aws-sdk");
const lambda = new AWS.Lambda({ apiVersion: "2015-03-31" });
const sfn = new AWS.StepFunctions();
const la = require("bioimage-lambda");
const su = require("short-uuid");

const MESSAGE_LAMBDA_ARN = process.env.MESSAGE_LAMBDA_ARN || "";
const IMAGE_MANAGEMENT_LAMBDA_ARN = process.env.IMAGE_MANAGEMENT_LAMBDA_ARN || "";
const TRAIN_CONFIGURATION_LAMBDA_ARN = process.env.TRAIN_CONFIGURATION_LAMBDA_ARN || "";
const TRAIN_SFN_ARN = process.env.TRAIN_SFN_ARN || "";

async function startTrain(embeddingName: string, filterBucket: string, filterKey: string) {
  const executionName = "Train-" + embeddingName + "-" + su.generate();
  const inputStr = `{ "embeddingName" : \"${executionName}\", "filterBucket" : \"${filterBucket}\", "filterKey" : \"${filterKey}\" }`;
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
  console.log("getEmbeddingInfo response=");
  console.log(response)
  return true;
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
        console.log("validEmbedding=")
        console.log(validEmbedding)
        if (!validEmbedding) {
          const errMsg = `Embedding ${event.embeddingName} is not valid`;
          console.log(errMsg)
          throw new Error(errMsg)
        } else {
          const filterBucket = event.filterBucket || "";
          const filterKey = event.filterKey || "";
          const response = await startTrain(
            event.embeddingName,
            event.filterBucket,
            event.filterKey
          );
          return { statusCode: 200, body: JSON.stringify(response) };
        }
      } catch (error) {
        return { statusCode: 500, body: JSON.stringify(error) };
      }
    } else {
      return {
        statusCode: 400,
        body: `Error: embeddingName required`,
      };
    }
  } else {
    return {
      statusCode: 400,
      body: `Do not recognize method type ${event.method}`,
    };
  }
};

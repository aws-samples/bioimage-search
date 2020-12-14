const AWS = require("aws-sdk");
const lambda = new AWS.Lambda({ apiVersion: "2015-03-31" });
const sfn = new AWS.StepFunctions();
const la = require("bioimage-lambda");
const su = require("short-uuid");

const MESSAGE_LAMBDA_ARN = process.env.MESSAGE_LAMBDA_ARN || "";
const IMAGE_MANAGEMENT_LAMBDA_ARN = process.env.IMAGE_MANAGEMENT_LAMBDA_ARN || "";
const PROCESS_PLATE_SFN_ARN = process.env.PROCESS_PLATE_SFN_ARN || "";
const UPLOAD_SOURCE_PLATE_SFN_ARN = process.env.UPLOAD_SOURCE_PLATE_SFN_ARN || "";

async function startUploadSourcePlate(plateId: string) {
  const executionName = "UploadSourcePlate-" + plateId + "-" + su.generate();
  const inputStr = `{ "plateId" : \"${plateId}\" }`;
  console.log("inputStr=", inputStr);
  var params = {
    stateMachineArn: UPLOAD_SOURCE_PLATE_SFN_ARN,
    input: inputStr,
    name: executionName,
  };
  console.log("startUploadSourcePlate params=");
  console.log(params);
  const response = await sfn.startExecution(params).promise();
  return response;
}

async function startProcessPlate(plateId: string, embeddingName: string) {
  const executionName = "ProcessPlate-" + plateId + "-" + embeddingName + "-" + su.generate();
  const inputStr = `{ "plateId" : \"${plateId}\", "embeddingName" : \"${embeddingName}\" }`;
  console.log("inputStr=", inputStr);
  var params = {
    stateMachineArn: PROCESS_PLATE_SFN_ARN,
    input: inputStr,
    name: executionName,
  };
  console.log("startProcessPlate params=");
  console.log(params);
  const response = await sfn.startExecution(params).promise();
  return response;
}

async function populateSourcePlate(inputBucket: any, inputKey: any) {
  var params = {
    FunctionName: IMAGE_MANAGEMENT_LAMBDA_ARN,
    InvocationType: "RequestResponse",
    Payload: JSON.stringify({
      method: "populateSourcePlate",
      inputBucket: inputBucket,
      inputKey: inputKey,
    }),
  };
  console.log("populateSourcePlate params=");
  console.log(params);
  const data = await lambda.invoke(params).promise();
  const response = la.getResponseBody(data);
  return response["plateId"];
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
        const plateId = await populateSourcePlate(
          event.inputBucket,
          event.inputKey
        );
        const response = await startUploadSourcePlate(plateId);
        return { statusCode: 200, body: response };
      } catch (dbError) {
        return { statusCode: 500, body: JSON.stringify(dbError) };
      }
    } else {
      return {
        statusCode: 400,
        body: `Error: embedding required`,
      };
    }
  } else if (event.method === "processPlate") {
    if (event.plateId && event.embeddingName) {
      try {
        const response = await startProcessPlate(event.plateId, event.embeddingName);
        return { statusCode: 200, body: response };
      } catch (error) {
        return { statusCode: 500, body: JSON.stringify(error) };
      }
    } else {
      return {
        statusCode: 400,
        body: `Error: embedding required`,
      };
    }
  } else {
    return {
      statusCode: 400,
      body: `Do not recognize method type ${event.method}`,
    };
  }
};

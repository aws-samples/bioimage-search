const AWS = require("aws-sdk");
const lambda = new AWS.Lambda({apiVersion: '2015-03-31'});
const sfn = new AWS.StepFunctions();
const la = require("bioimage-lambda");
const su = require("short-uuid")

const MESSAGE_LAMBDA_ARN = process.env.MESSAGE_LAMBDA_ARN || "";
const IMAGE_MANAGEMENT_LAMBDA_ARN = process.env.IMAGE_MANAGEMENT_LAMBA_ARN || "";
const PROCESS_PLATE_SFN_ARN = process.env.PROCESS_PLATE_SFN_ARN || "";


async function startExecution(plateId: string) {
  const executionName = "ProcessPlate-"+plateId+"-"+su.generate()
  const inputStr = `{ "plateId" : \"${plateId}\" }`;
  console.log("inputStr=", inputStr);
  var params = {
    stateMachineArn: PROCESS_PLATE_SFN_ARN,
    input: inputStr,
    name: executionName,
//    traceHeader: 'STRING_VALUE'
  };
  console.log("params=", params)
  const response = await sfn.startExecution(params).promise()
  return response
}

/////////////////////////////////////////////////

export const handler = async (event: any = {}): Promise<any> => {

  if (!event.method) {
    console.log("Error: method parameter required - returning status code 400");
    return { statusCode: 400, body: `Error: method parameter required` };
  }

  if (event.method === "processPlate") {
    if (event.plateId) {
      try {
        const response = await startExecution(event.plateId);
        return { statusCode: 200, body: JSON.stringify(response) };
      } catch (error) {
        return { statusCode: 500, body: JSON.stringify(error) };
      }
    } else {
      return {
        statusCode: 400,
        body: `Error: embedding required`,
      };
    }
  }
  
  else {
    return { statusCode: 400, body: `Do not recognize method type ${event.method}` }
  }

};
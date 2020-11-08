const AWS = require("aws-sdk");
const lambda = new AWS.Lambda({apiVersion: '2015-03-31'});
const sfn = new AWS.StepFunctions();
const la = require("bioimage-lambda");
const su = require("short-uuid")

const MESSAGE_LAMBDA_ARN = process.env.MESSAGE_LAMBDA_ARN || "";
const IMAGE_MANAGEMENT_LAMBDA_ARN = process.env.IMAGE_MANAGEMENT_LAMBA_ARN || "";
const PROCESS_PLATE_SFN_ARN = process.env.PROCESS_PLATE_SFN_ARN || "";

/////////////////////////////////////////////////

export const handler = async (event: any = {}): Promise<any> => {

  if (!event.method) {
    console.log("Error: method parameter required - returning status code 400");
    return { statusCode: 400, body: `Error: method parameter required` };
  }

// PLACEHOLDER

//   if (event.method === "processPlate") {
//     if (event.inputBucket && event.inputKey) {
//       try {
//         const response = await processPlate(event.inputBucket, event.inputKey);
//         return { statusCode: 200, body: JSON.stringify(response) };
//       } catch (dbError) {
//         return { statusCode: 500, body: JSON.stringify(dbError) };
//       }
//     } else {
//       return {
//         statusCode: 400,
//         body: `Error: embedding required`,
//       };
//     }
//   }
  
  else {
    return { statusCode: 400, body: `Do not recognize method type ${event.method}` }
  }

};
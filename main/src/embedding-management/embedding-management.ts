const AWS = require("aws-sdk");
const lambda = new AWS.Lambda({ apiVersion: "2015-03-31" });
const sfn = new AWS.StepFunctions();
const la = require("bioimage-lambda");
const su = require("short-uuid");

const EMBEDDING_COMPUTE_SFN_ARN = process.env.EMBEDDING_COMPUTE_SFN_ARN || "";

async function describeExecution(executionArn: any) {
  const params = {
    "executionArn" : executionArn
  }
  const response = await sfn.describeExecution(params).promise();
  return response
}

/////////////////////////////////////////////////

export const handler = async (event: any = {}): Promise<any> => {
  
  if (!event.method) {
    console.log("Error: method parameter required - returning status code 400");
    return { statusCode: 400, body: `Error: method parameter required` };
  }

 if (event.method === "describeExecution") {
    if (event.executionArn) {
      try {
        const response = await describeExecution(event.executionArn);
        return { statusCode: 200, body: response };
      } catch (error) {
        return { statusCode: 500, body: JSON.stringify(error) };
      }
    } else {
      return {
        statusCode: 400,
        body: `Error: plateId and embeddingName required`,
      };
    }
  } else {
    return {
      statusCode: 400,
      body: `Do not recognize method type ${event.method}`,
    };
  }
  
};

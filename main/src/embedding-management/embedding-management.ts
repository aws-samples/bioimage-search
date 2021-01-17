const AWS = require("aws-sdk");
const lambda = new AWS.Lambda({ apiVersion: "2015-03-31" });
const sfn = new AWS.StepFunctions();
const la = require("bioimage-lambda");

const EMBEDDING_COMPUTE_SFN_ARN = process.env.EMBEDDING_COMPUTE_SFN_ARN || "";

async function describeExecution(executionArn: any) {
  const params = {
    "executionArn" : executionArn
  }
  const response = await sfn.describeExecution(params).promise();
  // Adapter to compensate for different keys between SFN runtime and 'describeExecution' method
  response['ExecutionArn']=response['executionArn']
  return response
}

/////////////////////////////////////////////////

export const handler = async (event: any = {}): Promise<any> => {
  
  if (!event.method) {
    console.log("Error: method parameter required - returning status code 400");
    return { statusCode: 400, body: `Error: method parameter required` };
  }

 if (event.method === "describeExecution") {
    if (event.ExecutionArn) {
      try {
        const response = await describeExecution(event.ExecutionArn);
        return { statusCode: 200, body: response };
      } catch (error) {
        return { statusCode: 500, body: JSON.stringify(error) };
      }
    } else if (event.executionArn) {
      try {
        const response = await describeExecution(event.executionArn);
        return { statusCode: 200, body: response };
      } catch (error) {
        return { statusCode: 500, body: JSON.stringify(error) };
      }
    } else {
      return {
        statusCode: 400,
        body: `Must specify ExecutionArn or executionArn`,
      };
    }
  } else {
    return {
      statusCode: 400,
      body: `Do not recognize method type ${event.method}`,
    };
  }
  
};

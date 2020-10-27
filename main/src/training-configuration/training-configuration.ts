const AWS = require("aws-sdk");
const db = new AWS.DynamoDB.DocumentClient();
const dy = require("bioimage-dynamo");
const TABLE_NAME = process.env.TABLE_NAME || "";
const PARTITION_KEY = process.env.PARTITION_KEY || "";
const LATEST = "LATEST";
const DDB_MAX_BATCH = 25;

const FILTER_BUCKET_ATTRIBUTE = "filter-bucket";
const FILTER_INCLUDE_KEY_ATTRIBUTE = "filter-include-key";
const FILTER_EXCLUDE_KEY_ATTRIBUTE = "filter-exclude-key";
const EMBEDDING_NAME_ATTRIBUTE = "embedding-name";
const SAGEMAKER_TRAIN_ID_ATTRIBUTE = "sagemaker-train-id";
const TRAINING_JOB_MESSAGE_ID_ATTRIBUTE = "train-message-id";
const MODEL_BUCKET_ATTRIBUTE = "model-bucket";
const MODEL_KEY_ATTRIBUTE = "model-key"

/*

  createTraining(training):
  {
    method: 'createTraining',
    training: training
  }
  
  deleteTraining(training):
  {
    method: 'deleteTraining',
    train_id: train_id
  }
  
  updateTraining(training):
  {
     method: 'updateTraining',
     training: training
  }

*/

function validateTraining(training: any): boolean {
  if (
    training[PARTITION_KEY] &&
    training[EMBEDDING_NAME_ATTRIBUTE]
  ) {
    return true;
  }
  return false;
}

function updateIntegrityCheck(training: any): boolean {
    return false;
}

function createTraining(training: any) {
}

function updateTraining(training: any) {
}

function deleteTraining(train_id: any) {
}

function getTraining(train_id: any) {
}

/////////////////////////////////////////////////////

// async function createEmbedding(embedding: any) {
//   const params = {
//     TableName: TABLE_NAME,
//     Item: embedding
//   };
//   try {
//     await db.put(params).promise();
//     return { statusCode: 201, body: "" };
//   } catch (dbError) {
//     return { statusCode: 500, body: JSON.stringify(dbError) };
//   }
// }

// async function deleteEmbedding(name: any) {
//   try {
//     let rows: any = await dy.getPartitionRows(db, PARTITION_KEY, name, TABLE_NAME);
//     let p: any[] = [];
//     let i = 0;
//     while (i < rows.length) {
//       let j = i + DDB_MAX_BATCH;
//       if (j > rows.length) {
//         j = rows.length;
//       }
//       p.push(dy.deleteRows(db, PARTITION_KEY, false, TABLE_NAME, rows.slice(i, j)));
//       i += j - i;
//     }
//     await Promise.all(p);
//     const response = "deleted " + rows.length + " items";
//     return { statusCode: 200, body: response };
//   } catch (dbError) {
//     return { statusCode: 500, body: JSON.stringify(dbError) };
//   } 
// }

////////////////////////////////////////////

export const handler = async (event: any = {}): Promise<any> => {
  if (!event.method) {
    console.log("Error: method parameter required - returning status code 400");
    return { statusCode: 400, body: `Error: method parameter required` };
  }

  if (event.method === "createTraining") {
    if (event.training) {
      if (!validateTraining(event.training)) {
        return {
          statusCode: 400,
          body: `Error: training does not validate`,
        };
      }
      return createTraining(event.training);
    } else {
      return {
        statusCode: 400,
        body: `Error: embedding required`,
      };
    }
  }
  
  else if (event.method === "getTraining") {
      if (event.train_id) {
          return getTraining(event.train_id)
      } else {
          return {
              statusCode: 400,
              body: `Error: train_id required`,
          }
      }
  }
  
  else if (event.method === "updateTraining") {
    if (event.training) {
        if (!updateIntegrityCheck(event.training)) {
            return {
                statusCode: 400,
                body: `Error: training update violates existing integrity`,
            };
        }
        return updateTraining(event.training)
    }      
  }

  else if (event.method === "deleteTraining") {
    if (event.train_id) {
      return deleteTraining(event.train_id);
    } else {
      return {
        statusCode: 400,
        body: `Error: train_id required`,
      };
    }
  }
  
};
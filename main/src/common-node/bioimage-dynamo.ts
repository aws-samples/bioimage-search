
export const getAllQueryData = async (db: any, params: any) => {
  const _getAllData = async (params: any, startKey: any) => {
    if (startKey) {
      params.ExclusiveStartKey = startKey;
    }
    return db.query(params).promise();
  };
  let lastEvaluatedKey = null;
  let rows: any[] = [];
  do {
    const result: any = await _getAllData(params, lastEvaluatedKey);
    rows = rows.concat(result.Items);
    lastEvaluatedKey = result.LastEvaluatedKey;
  } while (lastEvaluatedKey);
  return rows;
};

export const getAllScanData = async (db: any, params: any) => {
  const _getAllData = async (params: any, startKey: any) => {
    if (startKey) {
      params.ExclusiveStartKey = startKey;
    }
    return db.scan(params).promise();
  };
  let lastEvaluatedKey = null;
  let rows: any[] = [];
  do {
    const result: any = await _getAllData(params, lastEvaluatedKey);
    rows = rows.concat(result.Items);
    lastEvaluatedKey = result.LastEvaluatedKey;
  } while (lastEvaluatedKey);
  return rows;
};

export const getPartitionRows = async (db: any, partitionKey: any, key: any, table: any) => {
  const keyConditionExpression = partitionKey + " = :" + partitionKey;
  const expressionAttributeValues =
    '":' + partitionKey + '" : "' + key + '"';
  const params = {
    TableName: table,
    KeyConditionExpression: keyConditionExpression,
    ExpressionAttributeValues: JSON.parse(
      "{" + expressionAttributeValues + "}"
    ),
  };
  const result: any = await getAllQueryData(db, params);
  return result;
}

export const deleteRows = async (
  db: any,
  partition_key: any,
  sort_key: any,
  table: any,
  rows: any[]
) => {
  let delarr: any[] = [];
  if (sort_key) {
    for (let r of rows) {
      const pk = r[partition_key];
      const sk = r[sort_key];
      const dr = {
        DeleteRequest: { Key: { [partition_key]: pk, [sort_key]: sk } },
      };
      delarr.push(dr);
    }
  } else {
    for (let r of rows) {
      const pk = r[partition_key];
      const dr = {
        DeleteRequest: { Key: { [partition_key]: pk } },
      };
      delarr.push(dr);
    }
  }
  const requestItems = { [table]: delarr };
  const params = { RequestItems: requestItems };
  return db.batchWrite(params).promise();
}

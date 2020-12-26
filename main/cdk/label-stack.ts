import dynamodb = require("@aws-cdk/aws-dynamodb");
import lambda = require("@aws-cdk/aws-lambda");
import iam = require("@aws-cdk/aws-iam");
import cdk = require("@aws-cdk/core");

export interface LabelStackProps extends cdk.StackProps {
  dynamoTableNames: any;
}

const TABLE_NAME = "BioimsLabel";

export class LabelStack extends cdk.Stack {
  public labelLambdaArn: string;
  
  constructor(app: cdk.App, id: string, props: LabelStackProps) {
    super(app, id, props);

    var labelTable: dynamodb.ITable | null = null;

    var createTable = true;

    if (props.dynamoTableNames.indexOf(TABLE_NAME) > -1) {
      console.log("Found table " + TABLE_NAME);
      createTable = false;
    }

    if (createTable) {
      console.log("Creating new table " + TABLE_NAME);
      labelTable = new dynamodb.Table(this, "label", {
        partitionKey: {
          name: "category",
          type: dynamodb.AttributeType.STRING,
        },
        sortKey: {
          name: "label",
          type: dynamodb.AttributeType.STRING,
        },
        tableName: "BioimsLabel",
        billingMode: dynamodb.BillingMode.PAY_PER_REQUEST
      });
    } else {
      console.log("Using already existing table " + TABLE_NAME);
      labelTable = dynamodb.Table.fromTableName(this, TABLE_NAME, TABLE_NAME);
    }

    const labelLambda = new lambda.Function(this, "labelFunction", {
      code: new lambda.AssetCode("src/label/build"),
      handler: "label.handler",
      runtime: lambda.Runtime.NODEJS_12_X,
      environment: {
        TABLE_NAME: labelTable.tableName,
        PARTITION_KEY: "category",
        SORT_KEY: "label",
      },
    });

    labelTable.grantReadWriteData(labelLambda);
    this.labelLambdaArn = labelLambda.functionArn;
  }
  
}

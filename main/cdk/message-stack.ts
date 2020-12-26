import dynamodb = require("@aws-cdk/aws-dynamodb");
import lambda = require("@aws-cdk/aws-lambda");
import iam = require("@aws-cdk/aws-iam");
import cdk = require("@aws-cdk/core");
import {
  AttributeType,
  BillingMode,
  StreamViewType,
  ProjectionType,
  Table,
} from "@aws-cdk/aws-dynamodb";

export interface MessageStackProps extends cdk.StackProps {
  dynamoTableNames: any;
}

const TABLE_NAME = "BioimsMessage";

export class MessageStack extends cdk.Stack {
  public messageLambda: lambda.Function;

  constructor(app: cdk.App, id: string, props: MessageStackProps) {
    super(app, id, props);

    var messageTable: dynamodb.ITable | null = null;

    var createTable = true;

    if (props.dynamoTableNames.indexOf(TABLE_NAME) > -1) {
      console.log("Found table " + TABLE_NAME);
      createTable = false;
    }

    if (createTable) {
      console.log("Creating new table " + TABLE_NAME);
      messageTable = new dynamodb.Table(this, "message", {
        partitionKey: {
          name: "messageId",
          type: dynamodb.AttributeType.STRING,
        },
        sortKey: {
          name: "timestamp1",
          type: dynamodb.AttributeType.STRING,
        },
        tableName: TABLE_NAME,
        billingMode: BillingMode.PAY_PER_REQUEST
      });
    } else {
      console.log("Using already existing table " + TABLE_NAME);
      messageTable = dynamodb.Table.fromTableName(this, TABLE_NAME, TABLE_NAME);
    }

    this.messageLambda = new lambda.Function(this, "messageFunction", {
      code: lambda.Code.fromAsset("src/message/build"),
      handler: "message.handler",
      runtime: lambda.Runtime.NODEJS_12_X,
      environment: {
        TABLE_NAME: messageTable.tableName,
        PARTITION_KEY: "messageId",
        SORT_KEY: "timestamp1",
      },
    });

    messageTable.grantReadWriteData(this.messageLambda);
  }
  
}

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

export interface TagStackProps extends cdk.StackProps {
  dynamoTableNames: any;
}

const TABLE_NAME = "BioimsTag";

export class TagStack extends cdk.Stack {
  public tagLambda: lambda.Function;

  constructor(app: cdk.App, id: string, props: TagStackProps) {
    super(app, id, props);

    var tagTable: dynamodb.ITable | null = null;

    var createTable = true;

    if (props.dynamoTableNames.indexOf(TABLE_NAME) > -1) {
      console.log("Found table " + TABLE_NAME);
      createTable = false;
    }

    if (createTable) {
      console.log("Creating new table " + TABLE_NAME);
      tagTable = new dynamodb.Table(this, "tag", {
        partitionKey: {
          name: "tagValue",
          type: dynamodb.AttributeType.STRING,
        },
        sortKey: {
          name: "tagType",
          type: dynamodb.AttributeType.STRING
        },
        tableName: TABLE_NAME,
        billingMode: BillingMode.PAY_PER_REQUEST
      });
    } else {
      console.log("Using already existing table " + TABLE_NAME);
      tagTable = dynamodb.Table.fromTableName(this, TABLE_NAME, TABLE_NAME);
    }

    this.tagLambda = new lambda.Function(this, "tagFunction", {
      code: lambda.Code.fromAsset("src/tag/build"),
      handler: "tag.handler",
      runtime: lambda.Runtime.NODEJS_12_X,
      memorySize: 256,
      timeout: cdk.Duration.minutes(2),
      environment: {
        TABLE_NAME: tagTable.tableName,
        PARTITION_KEY: "tagValue",
        SORT_KEY: "tagType",
      },
    });

    tagTable.grantReadWriteData(this.tagLambda);
  }
  
}

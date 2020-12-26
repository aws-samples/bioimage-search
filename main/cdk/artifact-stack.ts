import dynamodb = require("@aws-cdk/aws-dynamodb");
import lambda = require("@aws-cdk/aws-lambda");
import iam = require("@aws-cdk/aws-iam");
import cdk = require("@aws-cdk/core");
import s3 = require("@aws-cdk/aws-s3");

export interface ArtifactStackProps extends cdk.StackProps {
  dynamoTableNames: any;
  dataBucket: s3.Bucket;
}

const TABLE_NAME = "BioimsArtifact";

export class ArtifactStack extends cdk.Stack {
  public artifactLambda: lambda.Function;
  
  constructor(app: cdk.App, id: string, props: ArtifactStackProps) {
    super(app, id, props);

    var artifactTable: dynamodb.ITable | null = null;

    var createTable = true;

    if (props.dynamoTableNames.indexOf(TABLE_NAME) > -1) {
      createTable = false;
    }

    if (createTable) {
      console.log("Creating new table "+TABLE_NAME)
      artifactTable = new dynamodb.Table(this, "artifact", {
        partitionKey: {
          name: "contextId",
          type: dynamodb.AttributeType.STRING,
        },
        sortKey: {
          name: "artifact",
          type: dynamodb.AttributeType.STRING,
        },
        tableName: TABLE_NAME,
        billingMode: dynamodb.BillingMode.PAY_PER_REQUEST
      });
    } else {
      console.log("Using already existing table "+TABLE_NAME)
      artifactTable = dynamodb.Table.fromTableName(
        this,
        TABLE_NAME,
        TABLE_NAME
      );
    }

    this.artifactLambda = new lambda.Function(this, "artifactFunction", {
      code: lambda.Code.fromAsset("src/artifact/build"),
      handler: "artifact.handler",
      runtime: lambda.Runtime.NODEJS_12_X,
      environment: {
        TABLE_NAME: artifactTable.tableName,
        PARTITION_KEY: "contextId",
        SORT_KEY: "artifact",
        BUCKET: props.dataBucket.bucketName
      },
    });

    artifactTable.grantReadWriteData(this.artifactLambda);
  }
  
}

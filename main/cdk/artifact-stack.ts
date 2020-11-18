import dynamodb = require("@aws-cdk/aws-dynamodb");
import lambda = require("@aws-cdk/aws-lambda");
import iam = require("@aws-cdk/aws-iam");
import cdk = require("@aws-cdk/core");

export interface ArtifactStackProps extends cdk.StackProps {
  dynamoTableNames: any;
}

const TABLE_NAME = "BioimsArtifact";

export class ArtifactStack extends cdk.Stack {
  public artifactLambdaArn: string;
  
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
      });
    } else {
      console.log("Using already existing table "+TABLE_NAME)
      artifactTable = dynamodb.Table.fromTableName(
        this,
        TABLE_NAME,
        TABLE_NAME
      );
    }

    const artifactLambda = new lambda.Function(this, "artifactFunction", {
      code: lambda.Code.fromAsset("src/artifact/build"),
      handler: "artifact.handler",
      runtime: lambda.Runtime.NODEJS_12_X,
      environment: {
        TABLE_NAME: artifactTable.tableName,
        PARTITION_KEY: "contextId",
        SORT_KEY: "artifact",
      },
    });

    artifactTable.grantReadWriteData(artifactLambda);
    this.artifactLambdaArn = artifactLambda.functionArn;
  }
  
}

import dynamodb = require("@aws-cdk/aws-dynamodb");
import lambda = require("@aws-cdk/aws-lambda");
import iam = require("@aws-cdk/aws-iam");
import cdk = require("@aws-cdk/core");
import { BioimageStack } from "../cdk/bioimage-stack";

export interface ArtifactStackProps extends cdk.StackProps {
  bioimageSearchManagedPolicy: iam.ManagedPolicy;
  dynamoTableNames: any;
}

const TABLE_NAME = "BioimsArtifact";

export class ArtifactStack extends BioimageStack {
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
          name: "compoundId",
          type: dynamodb.AttributeType.STRING,
        },
        sortKey: {
          name: "s3key",
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
        PARTITION_KEY: "compoundId",
        SORT_KEY: "s3key",
      },
    });

    artifactTable.grantReadWriteData(artifactLambda);

    const artifactLambdaArn = artifactLambda.functionArn;

    const artifactLambdaPolicyStatement = new iam.PolicyStatement({
      actions: ["lambda:InvokeFunction"],
      effect: iam.Effect.ALLOW,
      resources: [artifactLambdaArn],
    });

    props.bioimageSearchManagedPolicy.addStatements(
      artifactLambdaPolicyStatement
    );
  }
}

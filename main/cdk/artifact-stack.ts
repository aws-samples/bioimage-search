import dynamodb = require("@aws-cdk/aws-dynamodb");
import lambda = require("@aws-cdk/aws-lambda");
import iam = require("@aws-cdk/aws-iam");
import cdk = require("@aws-cdk/core");

export interface ArtifactStackProps extends cdk.StackProps {
  bioimageSearchManagedPolicy: iam.ManagedPolicy;
}

export class ArtifactStack extends cdk.Stack {
  constructor(app: cdk.App, id: string, props: ArtifactStackProps) {
    super(app, id, props);

     const artifactTable = new dynamodb.Table(this, "artifact", {
      partitionKey: {
        name: "compoundId",
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: "s3key",
        type: dynamodb.AttributeType.STRING,
      },
      tableName: "BioimsArtifact",
    });

//        code: new lambda.AssetCode("src/message"),

    const artifactLambda = new lambda.Function(
      this,
      "artifactFunction",
      {
        code: lambda.Code.fromAsset("src/artifact/build"),
        handler: "message.handler",
        runtime: lambda.Runtime.NODEJS_12_X,
        environment: {
          TABLE_NAME: artifactTable.tableName,
          PARTITION_KEY: "compoundId",
          SORT_KEY: "s3key",
        },
      }
    );

    artifactTable.grantReadWriteData(artifactLambda);

    const artifactLambdaArn = artifactLambda.functionArn
    
    const artifactLambdaPolicyStatement = new iam.PolicyStatement({
      actions: ["lambda:InvokeFunction"],
      effect: iam.Effect.ALLOW,
      resources: [ artifactLambdaArn ]
    })
    
    props.bioimageSearchManagedPolicy.addStatements(artifactLambdaPolicyStatement)
    
  }
}
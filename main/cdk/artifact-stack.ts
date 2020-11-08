import dynamodb = require("@aws-cdk/aws-dynamodb");
import lambda = require("@aws-cdk/aws-lambda");
import iam = require("@aws-cdk/aws-iam");
import cdk = require("@aws-cdk/core");
import { BioimageStack } from "../cdk/bioimage-stack";

export interface ArtifactStackProps extends cdk.StackProps {
  bioimageSearchManagedPolicy: iam.ManagedPolicy;
  dynamoTableNames: any;
}

export class ArtifactStack extends BioimageStack {
  
  constructor(app: cdk.App, id: string, props: ArtifactStackProps) {
    super(app, id, props);

    var artifactTable: dynamodb.ITable | null = null;

    var createTable = false;
    
    console.log("Check1")
    
    console.log(props.dynamoTableNames)
    
    console.log("Check1.1")

    try {
      console.log("Check2")
      artifactTable = dynamodb.Table.fromTableName(
        this,
        "BioimsArtifact",
        "BioimsArtifact"
      );
      console.log("Check3")
    } catch (error) {
      console.log("Check4")
      createTable = true;
    }

    if (createTable) {
      console.log("Check5")
      artifactTable = new dynamodb.Table(this, "artifact", {
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
    }

    if (artifactTable) {
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
}

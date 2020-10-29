import dynamodb = require("@aws-cdk/aws-dynamodb");
import lambda = require("@aws-cdk/aws-lambda");
import iam = require("@aws-cdk/aws-iam");
import cdk = require("@aws-cdk/core");

export interface ImageManagementStackProps extends cdk.StackProps {
  bioimageSearchManagedPolicy: iam.ManagedPolicy;
}

export class ImageManagementStack extends cdk.Stack {
  constructor(app: cdk.App, id: string, props: ImageManagementStackProps) {
    super(app, id, props);

    const imageManagementTable = new dynamodb.Table(this, "image-management", {
      partitionKey: {
        name: "imageId",
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: "trainId",
        type: dynamodb.AttributeType.STRING,
      },
      tableName: "BioimsImageManagement",
    });

    const imageManagementLambda = new lambda.Function(
      this,
      "imageManagementFunction",
      {
        code: lambda.Code.fromAsset("src/image-management/build"),
        handler: "image-management.handler",
        runtime: lambda.Runtime.NODEJS_12_X,
        environment: {
          TABLE_NAME: imageManagementTable.tableName,
          PARTITION_KEY: "imageId",
          SORT_KEY: "trainId",
        },
      }
    );

    imageManagementTable.grantFullAccess(imageManagementLambda);

    const imageManagementLambdaArn = imageManagementLambda.functionArn
    
    const imageManagementLambdaPolicyStatement = new iam.PolicyStatement({
      actions: ["lambda:InvokeFunction"],
      effect: iam.Effect.ALLOW,
      resources: [ imageManagementLambdaArn ]
    })
    
    props.bioimageSearchManagedPolicy.addStatements(imageManagementLambdaPolicyStatement)
    
  }
}
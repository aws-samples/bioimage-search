import dynamodb = require("@aws-cdk/aws-dynamodb");
import lambda = require("@aws-cdk/aws-lambda");
import iam = require("@aws-cdk/aws-iam");
import cdk = require("@aws-cdk/core");

export interface ImageManagementStackProps extends cdk.StackProps {
  bioimageSearchManagedPolicy: iam.ManagedPolicy;
  trainingConfigurationLambdaArn: string;
  messageLambdaArn: string;
  externalResourcesPolicy: iam.Policy;
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
          TRAINING_CONFIGURATION_LAMBDA_ARN: props.trainingConfigurationLambdaArn,
          MESSAGE_LAMBDA_ARN: props.messageLambdaArn
        },
      }
    );
    
    const invokeLambdaPolicyStatement = new iam.PolicyStatement({
      actions: ["lambda:InvokeFunction"],
      effect: iam.Effect.ALLOW,
      resources: [ props.trainingConfigurationLambdaArn, props.messageLambdaArn ]
    })

    if (imageManagementLambda.role) {
      imageManagementLambda.role.attachInlinePolicy(props.externalResourcesPolicy);
      imageManagementLambda.role.addToPolicy(invokeLambdaPolicyStatement);
    }

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
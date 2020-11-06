import dynamodb = require("@aws-cdk/aws-dynamodb");
import { AttributeType, BillingMode, StreamViewType, ProjectionType, Table } from '@aws-cdk/aws-dynamodb';
import lambda = require("@aws-cdk/aws-lambda");
import iam = require("@aws-cdk/aws-iam");
import cdk = require("@aws-cdk/core");
import * as sfn from '@aws-cdk/aws-stepfunctions';
import * as tasks from '@aws-cdk/aws-stepfunctions-tasks';

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
    
    imageManagementTable.addGlobalSecondaryIndex({
      indexName: "plateIdIndex",
      partitionKey: {
        name: "plateId",
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: "imageId",
        type: dynamodb.AttributeType.STRING,
      },
      projectionType: ProjectionType.KEYS_ONLY
    })

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
          PLATE_INDEX: "plateIdIndex",
          TRAINING_CONFIGURATION_LAMBDA_ARN: props.trainingConfigurationLambdaArn,
          MESSAGE_LAMBDA_ARN: props.messageLambdaArn
        },
        memorySize: 3008,
        timeout: cdk.Duration.minutes(15),
      }
    );
    
    const imageInspectorLambda = new lambda.Function(
      this,
      "imageInspectorFunction",
      {
        code: lambda.Code.fromAsset("src/image-inspector/build"),
        handler: "image-inspector.handler",
        runtime: lambda.Runtime.PYTHON_3_8,
        memorySize: 3008,
        timeout: cdk.Duration.minutes(15),
        environment: {
          TABLE_NAME: imageManagementTable.tableName,
          PARTITION_KEY: "imageId",
          SORT_KEY: "trainId",
          PLATE_INDEX: "plateIdIndex",
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

    if (imageInspectorLambda.role) {
      imageInspectorLambda.role.attachInlinePolicy(props.externalResourcesPolicy);
      imageInspectorLambda.role.addToPolicy(invokeLambdaPolicyStatement);
    }

    imageManagementTable.grantFullAccess(imageManagementLambda);
    imageManagementTable.grantFullAccess(imageInspectorLambda);

    const imageManagementLambdaArn = imageManagementLambda.functionArn
    const imageInspectorLambdaArn = imageInspectorLambda.functionArn
    
    const imageManagementLambdaPolicyStatement = new iam.PolicyStatement({
      actions: ["lambda:InvokeFunction"],
      effect: iam.Effect.ALLOW,
      resources: [ imageManagementLambdaArn, imageInspectorLambdaArn ]
    })
    
    props.bioimageSearchManagedPolicy.addStatements(imageManagementLambdaPolicyStatement)
    
  }
}
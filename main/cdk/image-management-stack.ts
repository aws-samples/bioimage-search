import dynamodb = require("@aws-cdk/aws-dynamodb");
import {
  AttributeType,
  BillingMode,
  StreamViewType,
  ProjectionType,
  Table,
} from "@aws-cdk/aws-dynamodb";
import lambda = require("@aws-cdk/aws-lambda");
import iam = require("@aws-cdk/aws-iam");
import cdk = require("@aws-cdk/core");
import * as sfn from "@aws-cdk/aws-stepfunctions";
import * as tasks from "@aws-cdk/aws-stepfunctions-tasks";

export interface ImageManagementStackProps extends cdk.StackProps {
  trainingConfigurationLambda: lambda.Function;
  messageLambda: lambda.Function;
  artifactLambda: lambda.Function;
  dynamoTableNames: any;
}

const TABLE_NAME = "BioimsImageManagement";

export class ImageManagementStack extends cdk.Stack {
  public imageManagementLambda: lambda.Function;

  constructor(app: cdk.App, id: string, props: ImageManagementStackProps) {
    super(app, id, props);

    var imageManagementTable: dynamodb.Table | null = null;

    var createTable = true;

    if (props.dynamoTableNames.indexOf(TABLE_NAME) > -1) {
      console.log("Found table " + TABLE_NAME);
      createTable = false;
    }

    if (createTable) {
      console.log("Creating new table " + TABLE_NAME);
      imageManagementTable = new dynamodb.Table(this, "image-management", {
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
        projectionType: ProjectionType.KEYS_ONLY,
      });

    } else {
      console.log("Using already existing table " + TABLE_NAME);
      imageManagementTable = dynamodb.Table.fromTableName(
        this,
        TABLE_NAME,
        TABLE_NAME
      ) as Table;
    }


    this.imageManagementLambda = new lambda.Function(
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
          TRAINING_CONFIGURATION_LAMBDA_ARN:
            props.trainingConfigurationLambda.functionArn,
          MESSAGE_LAMBDA_ARN: props.messageLambda.functionArn,
          ARTIFACT_LAMBDA_ARN: props.artifactLambda.functionArn,
        },
        memorySize: 3008,
        timeout: cdk.Duration.minutes(15),
      }
    );

    const imageTableAccessPolicy = new iam.PolicyStatement({
      actions: ["dynamodb:*"],
      effect: iam.Effect.ALLOW,
      resources: [
        imageManagementTable.tableArn,
        imageManagementTable.tableArn + "/index/*"
        ]
    })

    const lambdaPolicy = new iam.Policy(this, "imageManagementAccessPolicy");
    lambdaPolicy.addStatements(imageTableAccessPolicy);

    this.imageManagementLambda!.role!.attachInlinePolicy(lambdaPolicy);
  }
  
}

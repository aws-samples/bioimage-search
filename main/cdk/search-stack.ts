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
import * as sqs from '@aws-cdk/aws-sqs';

export interface SearchStackProps extends cdk.StackProps {
  trainingConfigurationLambda: lambda.Function;
  messageLambda: lambda.Function;
  dynamoTableNames: any;
}

const TABLE_NAME = "BioimsSearch"

export class SearchStack extends cdk.Stack {
  public searchLambda: lambda.Function;
  public searchQueue: sqs.Queue;
  public managementQueue: sqs.Queue;

  constructor(app: cdk.App, id: string, props: SearchStackProps) {
    super(app, id, props);

    var searchTable: dynamodb.Table | null = null;

    var createTable = true;

    if (props.dynamoTableNames.indexOf(TABLE_NAME) > -1) {
      console.log("Found table " + TABLE_NAME);
      createTable = false;
    }

    if (createTable) {
      console.log("Creating new table " + TABLE_NAME);
      searchTable = new dynamodb.Table(this, "search", {
        partitionKey: {
          name: "searchId",
          type: dynamodb.AttributeType.STRING,
        },
        sortKey: {
          name: "imageId",
          type: dynamodb.AttributeType.STRING,
        },
        tableName: "BioimsSearch",
        billingMode: BillingMode.PAY_PER_REQUEST
      });
      
    } else {
      console.log("Using already existing table " + TABLE_NAME);
      searchTable = dynamodb.Table.fromTableName(
        this,
        TABLE_NAME,
        TABLE_NAME
      ) as Table;
    }
    
    this.searchQueue = new sqs.Queue(this, 'SearchQueue', {
      fifo: true,
    });

    this.managementQueue = new sqs.Queue(this, 'ManagementQueue', {
      fifo: true,
    });

    this.searchLambda = new lambda.Function(
      this,
      "searchFunction",
      {
        code: lambda.Code.fromAsset("src/search/build"),
        handler: "search.handler",
        runtime: lambda.Runtime.NODEJS_12_X,
        environment: {
          TABLE_NAME: searchTable.tableName,
          PARTITION_KEY: "searchId",
          SORT_KEY: "imageId",
          TRAINING_CONFIGURATION_LAMBDA_ARN: props.trainingConfigurationLambda.functionArn,
          MESSAGE_LAMBDA_ARN: props.messageLambda.functionArn,
          SEARCH_QUEUE_URL: this.searchQueue.queueUrl,
          MANAGEMENT_QUEUE_URL: this.managementQueue.queueUrl
        },
        memorySize: 3008,
        timeout: cdk.Duration.minutes(15),
      }
    );

    const searchTableAccessPolicy = new iam.PolicyStatement({
      actions: ["dynamodb:*"],
      effect: iam.Effect.ALLOW,
      resources: [
        searchTable.tableArn,
        searchTable.tableArn + "/index/*"
        ]
    })

    const lambdaPolicy = new iam.Policy(this, "searchAccessPolicy");
    lambdaPolicy.addStatements(searchTableAccessPolicy);

    this.searchLambda!.role!.attachInlinePolicy(lambdaPolicy);
  }
  
}

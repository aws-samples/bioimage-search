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
import { createTrainPlateVisitor } from '../cdk/process-plate-stack';
import { createEmbeddingPlateVisitor } from '../cdk/process-plate-stack';


export interface SearchStackProps extends cdk.StackProps {
  trainingConfigurationLambda: lambda.Function;
  imageManagementLambda: lambda.Function;
  processPlateLambda: lambda.Function;
  messageLambda: lambda.Function;
  dynamoTableNames: any;
  region: string;
}

const TABLE_NAME = "BioimsSearch"

export class SearchStack extends cdk.Stack {
  public searchLambda: lambda.Function;
  public searchQueue: sqs.Queue;
  public managementQueue: sqs.Queue;
  public searchTrainLoaderStateMachine: sfn.StateMachine;
  public searchTagLoaderStateMachine: sfn.StateMachine;

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
    
    this.searchQueue = new sqs.Queue(this, 'BioimsSearchQueue', {
      fifo: true,
    });

    this.managementQueue = new sqs.Queue(this, 'BioimsManagementQueue', {
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
          IMAGE_MANAGEMENT_LAMBDA_ARN: props.imageManagementLambda.functionArn,
          PROCESS_PLATE_LAMBDA_ARN: props.processPlateLambda.functionArn,
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

    // Train Loader
    const searchTrainLoaderPlateFunction = new tasks.LambdaInvoke(this, "SearchTrainLoaderPlateProcessor", {
      lambdaFunction: this.searchLambda,
      outputPath: '$.Payload.body'
    });

    const searchTrainPlateStateMachine = new sfn.StateMachine(this, "SearchTrainPlateStateMachine",
    {
      definition: searchTrainLoaderPlateFunction,
      timeout: cdk.Duration.hours(1)
    });
    
    const trainPlateProcessor = new tasks.StepFunctionsStartExecution(this, "SearchTrainPlateSFN", {
      stateMachine: searchTrainPlateStateMachine,
    });    

    const searchTrainLoader = createTrainPlateVisitor(this, "SearchTrainLoader", trainPlateProcessor, 0, 
      props.trainingConfigurationLambda, props.imageManagementLambda, props.processPlateLambda);
      
    this.searchTrainLoaderStateMachine = new sfn.StateMachine(this, "SearchTrainLoaderStateMachine",
      {
        definition: searchTrainLoader,
        timeout: cdk.Duration.hours(24),
      });

    // Tag Loader
    const searchTagLoaderPlateFunction = new tasks.LambdaInvoke(this, "SearchTagLoaderPlateProcessor", {
      lambdaFunction: this.searchLambda,
      outputPath: '$.Payload.body'
    });

    const searchTagPlateStateMachine = new sfn.StateMachine(this, "SearchTagPlateStateMachine",
    {
      definition: searchTagLoaderPlateFunction,
      timeout: cdk.Duration.hours(1)
    });
    
    const tagPlateProcessor = new tasks.StepFunctionsStartExecution(this, "SearchTagPlateSFN", {
      stateMachine: searchTagPlateStateMachine,
    });    

    const searchTagLoader = createEmbeddingPlateVisitor(this, "SearchTagLoader", tagPlateProcessor, 0, 
      props.trainingConfigurationLambda, props.imageManagementLambda, props.processPlateLambda);
      
    this.searchTagLoaderStateMachine = new sfn.StateMachine(this, "SearchTagLoaderStateMachine",
      {
        definition: searchTagLoader,
        timeout: cdk.Duration.hours(24),
      });

  }
  
}

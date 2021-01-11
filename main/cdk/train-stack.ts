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
import s3 = require("@aws-cdk/aws-s3");
import * as sfn from "@aws-cdk/aws-stepfunctions";
import * as tasks from "@aws-cdk/aws-stepfunctions-tasks";
import * as logs from "@aws-cdk/aws-logs";

export interface TrainStackProps extends cdk.StackProps {
  messageLambda: lambda.Function;
  imageManagementLambda: lambda.Function;
  trainingConfigurationLambda: lambda.Function;
  processPlateLambda: lambda.Function;
  artifactLambda: lambda.Function;
  dataBucket: s3.Bucket;
}

export class TrainStack extends cdk.Stack {
  public trainLambda: lambda.Function;
  public trainBuildLambda: lambda.Function;
  public trainComputeLambda: lambda.Function;
  public trainStateMachine: sfn.StateMachine;

  constructor(app: cdk.App, id: string, props: TrainStackProps) {
    super(app, id, props);
    
    this.trainComputeLambda = new lambda.Function(
      this,
      "trainComputeFunction",
      {
        code: lambda.Code.fromAsset("src/training-compute/build"),
        handler: "training-compute.handler",
        runtime: lambda.Runtime.PYTHON_3_8,
        memorySize: 256,
        timeout: cdk.Duration.minutes(5),
        environment: {
          MESSAGE_LAMBDA_ARN: props.messageLambda.functionArn,
          IMAGE_MANAGEMENT_LAMBDA_ARN: props.imageManagementLambda.functionArn,
          TRAIN_CONFIGURATION_LAMBDA_ARN: props.trainingConfigurationLambda.functionArn,
          ARTIFACT_LAMBDA_ARN: props.artifactLambda.functionArn,
          BUCKET: props.dataBucket.bucketName
        },
      }
    );

    this.trainBuildLambda = new lambda.Function(
      this,
      "trainBuildFunction",
      {
        code: lambda.Code.fromAsset("src/training-build/build"),
        handler: "training-build.handler",
        runtime: lambda.Runtime.PYTHON_3_8,
        memorySize: 512,
        timeout: cdk.Duration.minutes(15),
        environment: {
          MESSAGE_LAMBDA_ARN: props.messageLambda.functionArn,
          IMAGE_MANAGEMENT_LAMBDA_ARN: props.imageManagementLambda.functionArn,
          TRAIN_CONFIGURATION_LAMBDA_ARN: props.trainingConfigurationLambda.functionArn,
          ARTIFACT_LAMBDA_ARN: props.artifactLambda.functionArn,
          BUCKET: props.dataBucket.bucketName
        },
      }
    );

    ///////////////////////////////////////////
    //
    // Train StepFunction
    //
    ///////////////////////////////////////////

    const trainInfoRequest = new sfn.Pass(this, "Train Info Request", {
      parameters: {
        method: "getTraining",
        trainId: sfn.JsonPath.stringAt("$.trainId"),
      },
      resultPath: '$.trainInfoRequest'
    });

    const trainInfo = new tasks.LambdaInvoke(this, "Train Info", {
      lambdaFunction: props.trainingConfigurationLambda,
      resultPath: '$.trainInfo',
      inputPath: '$.trainInfoRequest',
    });
    
    const embeddingInfoRequest = new sfn.Pass(this, "Embedding Info Request", {
      parameters: {
        method: "getEmbeddingInfo",
        embeddingName: sfn.JsonPath.stringAt('$.trainInfo.Payload.body.embeddingName')
      },
      resultPath: '$.embeddingInfoRequest'
    });
    
    const embeddingInfo = new tasks.LambdaInvoke(this, "Embedding Info", {
      lambdaFunction: props.trainingConfigurationLambda,
      resultPath: sfn.JsonPath.stringAt('$.embeddingInfo'),
      inputPath: '$.embeddingInfoRequest',
    });

    const plateSurveyRequest = new sfn.Pass(this, "Plate Survey Request", {
      parameters: {
        method: "listCompatiblePlates",
        width: sfn.JsonPath.stringAt('$.embeddingInfo.Payload.body.Item.inputWidth'),
        height: sfn.JsonPath.stringAt('$.embeddingInfo.Payload.body.Item.inputHeight'),
        depth: sfn.JsonPath.stringAt('$.embeddingInfo.Payload.body.Item.inputDepth'),
        channels: sfn.JsonPath.stringAt('$.embeddingInfo.Payload.body.Item.inputChannels')
      },
      resultPath: '$.plateSurveyRequest'
    });
    
    const plateList = new tasks.LambdaInvoke(this, "Plate List", {
      lambdaFunction: props.imageManagementLambda,
      resultPath: sfn.JsonPath.stringAt('$.plateList'),
      inputPath: '$.plateSurveyRequest'
    });
    
    const plateProcessor = new tasks.LambdaInvoke(this, "Process Plate", {
      lambdaFunction: props.processPlateLambda,
      outputPath: '$.Payload.body'
    });
    
    const plateWait = new sfn.Wait(this, "Plate Wait", {
      time: sfn.WaitTime.duration(cdk.Duration.seconds(30))
    });
    
    const plateStatusInput = new sfn.Pass(this, "Plate Status Input", {
      parameters: {
        method: "describeExecution",
        executionArn: sfn.JsonPath.stringAt('$.executionArn')
      }
    });
    
    const plateStatus = new tasks.LambdaInvoke(this, "Plate Status", {
      lambdaFunction: props.processPlateLambda,
      outputPath: '$.Payload.body'      
    });
    
    const plateNotRunning = new sfn.Pass(this, "Plate Not Running", {
      parameters: {
        status: sfn.JsonPath.stringAt('$.status')
      }
    });
    
    const plateSequence = plateProcessor
      .next(plateWait)
      .next(plateStatusInput)
      .next(plateStatus)
      .next(new sfn.Choice(this, 'Plate Sfn Complete?')
        .when(sfn.Condition.stringEquals('$.status', 'RUNNING'), plateWait)
        .otherwise(plateNotRunning));

    const plateProcessMap = new sfn.Map(this, "Plate Process Map", {
      maxConcurrency: 10,
      itemsPath: '$.plateList.Payload.body',
      resultPath: '$.plateProcessMapResult',
      parameters: {
        method: "processPlate",
        embeddingName: sfn.JsonPath.stringAt('$.trainInfo.Payload.body.embeddingName'),
        'plateId.$' : "$$.Map.Item.Value.plateId"
      }
    });
    plateProcessMap.iterator(plateSequence);
    
    const trainBuildInput = new sfn.Pass(this, "Train Build Input", {
      parameters: {
        trainId: sfn.JsonPath.stringAt("$.trainId")
      }
    });
    
    const trainBuild = new tasks.LambdaInvoke(this, "Train Build", {
      lambdaFunction: this.trainBuildLambda,
      resultPath: '$.trainBuildOutput'
    });
    
    const trainComputeInput= new sfn.Pass(this, "Train Compute Input", {
      parameters: {
        trainId: sfn.JsonPath.stringAt("$.trainId")
      }
    });
    
    const trainCompute = new tasks.LambdaInvoke(this, "Train Compute", {
      lambdaFunction: this.trainComputeLambda,
      resultPath: '$.trainComputeOutput'
    });

    const trainStepFunctionDef = trainInfoRequest
      .next(trainInfo)
      .next(embeddingInfoRequest)
      .next(embeddingInfo)
      .next(plateSurveyRequest)
      .next(plateList)
      .next(plateProcessMap)
      .next(trainBuildInput)
      .next(trainBuild)
      .next(trainComputeInput)
      .next(trainCompute)

    const trainLogGroup = new logs.LogGroup(this, "TrainLogGroup");

    this.trainStateMachine = new sfn.StateMachine(
      this,
      "Train StateMachine",
      {
        definition: trainStepFunctionDef,
        timeout: cdk.Duration.hours(24),
        logs: {
          destination: trainLogGroup,
          level: sfn.LogLevel.ALL,
        },
      }
    );

    //////////////////////////////////////////
    
    this.trainLambda = new lambda.Function(
      this,
      "trainFunction",
      {
        code: lambda.Code.fromAsset("src/train/build"),
        handler: "train.handler",
        runtime: lambda.Runtime.NODEJS_12_X,
        memorySize: 512,
        timeout: cdk.Duration.minutes(15),
        environment: {
          MESSAGE_LAMBDA_ARN: props.messageLambda.functionArn,
          IMAGE_MANAGEMENT_LAMBDA_ARN: props.imageManagementLambda.functionArn,
          TRAIN_CONFIGURATION_LAMBDA_ARN: props.trainingConfigurationLambda.functionArn,
          TRAIN_SFN_ARN: this.trainStateMachine.stateMachineArn,
          TRAIN_BUILD_LAMBDA_ARN: this.trainBuildLambda.functionArn
        },
      }
    );

    // This is not necessary if the function is included in external iam policy in resource-permissions-stack    
    //const trainLambdaOutput = new cdk.CfnOutput(this, 'trainLambda', { value: this.trainLambda.functionArn } )

  }
}
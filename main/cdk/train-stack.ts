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
import * as logs from "@aws-cdk/aws-logs";

export interface TrainStackProps extends cdk.StackProps {
  messageLambda: lambda.Function;
  imageManagementLambda: lambda.Function;
  trainingConfigurationLambda: lambda.Function;
}

export class TrainStack extends cdk.Stack {
  public trainLambda: lambda.Function;
  public trainStateMachine: sfn.StateMachine;

  constructor(app: cdk.App, id: string, props: TrainStackProps) {
    super(app, id, props);

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
      resultPath: sfn.JsonPath.stringAt('$.trainInfo'),
      inputPath: '$.trainInfoRequest',
    });
    
    const embeddingInfoRequest = new sfn.Pass(this, "Embedding Info Request", {
      parameters: {
        method: "getEmbeddingInfo",
        embeddingName: sfn.JsonPath.stringAt('$.trainInfo.Payload.body.embeddingName')
      },
      resultPath: '$.embeddingInfoRequest'
    })
    
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
    })

    const trainStepFunctionDef = trainInfoRequest
      .next(trainInfo)
      .next(embeddingInfoRequest)
      .next(embeddingInfo)
      .next(plateSurveyRequest)      

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
        },
      }
    );

    // This is not necessary if the function is included in external iam policy in resource-permissions-stack    
    //const trainLambdaOutput = new cdk.CfnOutput(this, 'trainLambda', { value: this.trainLambda.functionArn } )

  }
}
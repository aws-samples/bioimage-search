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

    const trainInfoRequestParameters = new sfn.Pass(this, "Train Info Request Parameters", {
      parameters: {
        method: "getTrainInfo",
        plateId: sfn.JsonPath.stringAt("$.embeddingName"),
      },
    });

    const trainInfoRequest = new tasks.LambdaInvoke(this, "Train Info Request", {
      lambdaFunction: props.trainingConfigurationLambda,
    });

    const trainStepFunctionDef = trainInfoRequestParameters
      .next(trainInfoRequest)

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
    
    const trainLambdaOutput = new cdk.CfnOutput(this, 'trainLambda', { value: this.trainLambda.functionArn } )

  }
}
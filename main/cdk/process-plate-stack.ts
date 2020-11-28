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

export interface ProcessPlateStackProps extends cdk.StackProps {
  messageLambda: lambda.Function;
  imageManagementLambda: lambda.Function;
}

export class ProcessPlateStack extends cdk.Stack {
  public imageInspectorLambda: lambda.Function;
  public processPlateLambda: lambda.Function;
  public uploadSourcePlateStateMachine: sfn.StateMachine;
  public processPlateStateMachine: sfn.StateMachine;

  constructor(app: cdk.App, id: string, props: ProcessPlateStackProps) {
    super(app, id, props);

    this.imageInspectorLambda = new lambda.Function(
      this,
      "imageInspectorFunction",
      {
        code: lambda.Code.fromAsset("src/image-inspector/build"),
        handler: "image-inspector.handler",
        runtime: lambda.Runtime.PYTHON_3_8,
        memorySize: 3008,
        timeout: cdk.Duration.minutes(15),
        environment: {
          MESSAGE_LAMBDA_ARN: props.messageLambda.functionArn,
          IMAGE_MANAGEMENT_LAMBDA_ARN: props.imageManagementLambda.functionArn,
        },
      }
    );
    
    ///////////////////////////////////////////
    //
    // UploadSourcePlate StepFunction
    //
    ///////////////////////////////////////////

    const plateFormat1 = new sfn.Pass(this, "Plate Format 1", {
      parameters: {
        method: "getImagesByPlateId",
        plateId: sfn.JsonPath.stringAt("$.plateId"),
      },
    });

    const plateToImages1 = new tasks.LambdaInvoke(this, "Plate To Images 1", {
      lambdaFunction: props.imageManagementLambda,
    });

    const imageInspector = new tasks.LambdaInvoke(this, "Image Inspector", {
      lambdaFunction: this.imageInspectorLambda,
    });

    const inspectorMap = new sfn.Map(this, "Inspector Map", {
      maxConcurrency: 0,
      itemsPath: "$.Payload.body"
    });
    inspectorMap.iterator(imageInspector);
    
    const uploadSourcePlateStepFunctionDef = plateFormat1
      .next(plateToImages1)
      .next(inspectorMap)

    const uploadSourcePlateGroup = new logs.LogGroup(this, "UploadSourcePlateLogGroup");

    this.uploadSourcePlateStateMachine = new sfn.StateMachine(
      this,
      "Upload Source Plate StateMachine",
      {
        definition: uploadSourcePlateStepFunctionDef,
        timeout: cdk.Duration.minutes(5),
        logs: {
          destination: uploadSourcePlateGroup,
          level: sfn.LogLevel.ALL,
        },
      }
    );

    ///////////////////////////////////////////
    //
    // PlateProcessing StepFunction
    //
    ///////////////////////////////////////////
    
    const plateFormat2 = new sfn.Pass(this, "Plate Format 2", {
      parameters: {
        method: "getImagesByPlateId",
        plateId: sfn.JsonPath.stringAt("$.plateId"),
      },
    });

    const plateToImages2 = new tasks.LambdaInvoke(this, "Plate To Images 2", {
      lambdaFunction: props.imageManagementLambda,
    });


    const plateValidationParams = sfn.TaskInput.fromObject( {
      method: "validatePlate",
      plateId: sfn.JsonPath.stringAt("$.plateId"),
    });
    
    const plateValidator = new tasks.LambdaInvoke(this, "Plate Validator", {
      lambdaFunction: props.imageManagementLambda,
      payload: plateValidationParams,
    });

    const processPlateStepFunctionDef = plateFormat2
      .next(plateToImages2)
      .next(plateValidator)

    const logGroup = new logs.LogGroup(this, "ProcessPlateLogGroup");

    this.processPlateStateMachine = new sfn.StateMachine(
      this,
      "Process Plate StateMachine",
      {
        definition: processPlateStepFunctionDef,
        timeout: cdk.Duration.minutes(3),
        logs: {
          destination: logGroup,
          level: sfn.LogLevel.ALL,
        },
      }
    );

    //////////////////////////////////////////
    
    this.processPlateLambda = new lambda.Function(
      this,
      "processPlateFunction",
      {
        code: lambda.Code.fromAsset("src/process-plate/build"),
        handler: "process-plate.handler",
        runtime: lambda.Runtime.NODEJS_12_X,
        memorySize: 512,
        timeout: cdk.Duration.minutes(3),
        environment: {
          MESSAGE_LAMBDA_ARN: props.messageLambda.functionArn,
          IMAGE_MANAGEMENT_LAMBDA_ARN: props.imageManagementLambda.functionArn,
          PROCESS_PLATE_SFN_ARN: this.processPlateStateMachine.stateMachineArn,
          UPLOAD_SOURCE_PLATE_SFN_ARN: this.uploadSourcePlateStateMachine.stateMachineArn,
        },
      }
    );
  }
}

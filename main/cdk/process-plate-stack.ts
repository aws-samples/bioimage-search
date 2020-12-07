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
import batch = require("@aws-cdk/aws-batch");

export interface ProcessPlateStackProps extends cdk.StackProps {
  messageLambda: lambda.Function;
  imageManagementLambda: lambda.Function;
  trainingConfigurationLambda: lambda.Function;
  batchSpotQueue: batch.JobQueue;
}

export class ProcessPlateStack extends cdk.Stack {
  public imageInspectorLambda: lambda.Function;
  public processPlateLambda: lambda.Function;
  public uploadSourcePlateStateMachine: sfn.StateMachine;
  public processPlateStateMachine: sfn.StateMachine;
  
  private messageLambda: lambda.Function;
  
  createSfnMessage(messageName: any, messageContent:any) {
    const inputName = messageName + "Input"
    const outputName = messageName + "Output"
    const inputPath = '$.' + inputName
    const outputPath = '$.' + outputName
    const messageInput = new sfn.Pass(this, inputName, {
      parameters: {
        method: "addMessage",
        messageId: sfn.JsonPath.stringAt("$.plateMessageId.Payload.body"),
        message: messageContent
      },
      resultPath: inputPath
    })
    const message = new tasks.LambdaInvoke(this, messageName, {
      lambdaFunction: this.messageLambda,
      inputPath: inputPath,
      resultPath: outputPath
    });
    return messageInput.next(message);
  }


  constructor(app: cdk.App, id: string, props: ProcessPlateStackProps) {
    super(app, id, props);
    
    this.messageLambda = props.messageLambda

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
    // UploadSourcePlate State Machine
    //
    ///////////////////////////////////////////

    const plateFormat1 = new sfn.Pass(this, "Plate Format 1", {
      parameters: {
        method: "getImagesByPlateId",
        plateId: sfn.JsonPath.stringAt("$.plateId"),
      },
      resultPath: '$.getImagesInput',
    });

    const plateToImages1 = new tasks.LambdaInvoke(this, "Plate To Images 1", {
      lambdaFunction: props.imageManagementLambda,
      inputPath: '$.getImagesInput',
      resultPath: '$.imageList'
    });

    const imageInspector = new tasks.LambdaInvoke(this, "Image Inspector", {
      lambdaFunction: this.imageInspectorLambda,
      outputPath: '$.Payload'
    });

    const inspectorMap = new sfn.Map(this, "Inspector Map", {
      maxConcurrency: 0,
      itemsPath: '$.imageList.Payload.body',
      resultPath: '$.inspectorMapResult',
    });
    inspectorMap.iterator(imageInspector);
    
    const plateValidatorInput = new sfn.Pass(this, "Plate Validator Input", {
      parameters: {
        method: "validatePlate",
        plateId: sfn.JsonPath.stringAt("$.plateId")
      },
      resultPath: '$.validatorInput',
    });
    
    const plateValidator = new tasks.LambdaInvoke(this, "Plate Validator", {
      lambdaFunction: props.imageManagementLambda,
      inputPath: '$.validatorInput',
    });
    
    const uploadSourcePlateStepFunctionDef = plateValidatorInput
      .next(plateFormat1)
      .next(plateToImages1)
      .next(inspectorMap)
      .next(plateValidator)

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
    // Process Plate State Machine
    //
    ///////////////////////////////////////////
    

    const plateMessageInput = new sfn.Pass(this, "Plate Message Input", {
      parameters: {
        method: "getPlateMessageId",
        plateId: sfn.JsonPath.stringAt("$.plateId")
      },
      resultPath: '$.plateMessageInput',
    });
    
    const getPlateMessage = new tasks.LambdaInvoke(this, "Get Plate Message", {
      lambdaFunction: props.imageManagementLambda,
      inputPath: '$.plateMessageInput',
      resultPath: '$.plateMessageId'
    });

    // const startMessageInput = new sfn.Pass(this, "Start Message Input", {
    //   parameters: {
    //     method: "addMessage",
    //     messageId: sfn.JsonPath.stringAt("$.plateMessageId.Payload.body"),
    //     message: "Process Plate Start" 
    //   },
    //   resultPath: '$.startMessageInput'
    // });
    
    // const startMessage = new tasks.LambdaInvoke(this, "Start Message", {
    //   lambdaFunction: props.messageLambda,
    //   inputPath: '$.startMessageInput',
    //   resultPath: '$.startMessageOutput'
    // });
    
    const startMessage = this.createSfnMessage("StartMessage", "Process Plate Start");

    const plateValidatorInputPP = new sfn.Pass(this, "Plate Validator Input PP", {
      parameters: {
        method: "validatePlate",
        plateId: sfn.JsonPath.stringAt("$.plateId")
      },
      resultPath: '$.validatorInput',
    });
    
    const plateValidatorPP = new tasks.LambdaInvoke(this, "Plate Validator PP", {
      lambdaFunction: props.imageManagementLambda,
      inputPath: '$.validatorInput',
      resultPath: '$.plateStatus'
    });
    
    const validationFailureMessage = this.createSfnMessage("PlateValidationFailureMessage", "Plate Validation Failed");
    
    const plateValidationFailed = new sfn.Fail(this, 'Plate Validation Failed', {
      cause: 'Plate Validation Failed',
      error: 'Plate Validation Failed',
    });
    
    const validationFailure = validationFailureMessage.next(plateValidationFailed);
    
    const validationSucceededMessage = this.createSfnMessage("ValidationSucceeded", "Plate Validation Succeeded");
    
    const embeddingInfoRequest = new sfn.Pass(this, "Embedding Info Request", {
      parameters: {
        method: "getEmbeddingInfo",
        embeddingName: sfn.JsonPath.stringAt('$.embeddingName')
      },
      resultPath: '$.embeddingInfoRequest'
    })
    
    const embeddingInfo = new tasks.LambdaInvoke(this, "Embedding Info", {
      lambdaFunction: props.trainingConfigurationLambda,
      resultPath: sfn.JsonPath.stringAt('$.embeddingInfo'),
      inputPath: '$.embeddingInfoRequest',
    });

    const endpointStep = new sfn.Pass(this, "Endpoint Step", {
      parameters: {
        test: "success"
      },
      resultPath: '$.endpointStep'
    });
    
    const processPlateLambda = this. createSfnMessage("PlateLambda", "Placeholder Plate Lambda Job");
    
    const plateArnFailureMessage = this.createSfnMessage("PlateArnFailureMessage", "Plate Arn Method Failed");
    
    const plateArnFailed = new sfn.Fail(this, 'Plate Arn Failed', {
      cause: 'Plate Arn Failed',
      error: 'Plate Arn Failed',
    });
    
    const plateArnFailure = plateArnFailureMessage.next(plateArnFailed);
    
    const processPlateBatch = new tasks.BatchSubmitJob (this, "PlateBatchJob", {
      jobDefinition: batch.JobDefinition.fromJobDefinitionArn(this, "PlateBatchJobDefArn", sfn.JsonPath.stringAt('$.embeddingInfo.Payload.body.Item.plateMethodArn')),
      jobName: sfn.JsonPath.stringAt('$.plateId'),
      jobQueue: props.batchSpotQueue,
      payload: {
        type: sfn.InputType.OBJECT,
        value: {
          plateIdArg: '--plateId',
          plateId: sfn.JsonPath.stringAt('$.plateId'),
          embeddingNameArg: '--embeddingName',
          embeddingName: sfn.JsonPath.stringAt('$.embeddingName')
        }
      }
    });

    // Example Arns
    // arn:aws:lambda:us-east-1:580829821648:function:BioimageSearchLabelStack-labelFunction58A4020A-1TEZ4YLWTTXDH
    // arn:aws:batch:us-east-1:580829821648:job-definition/platepreprocessingjobde-614a2d2923fd2c7:1

    const processPlateStepFunctionDef = plateMessageInput
      .next(getPlateMessage)
      .next(startMessage)
      .next(plateValidatorInputPP)
      .next(plateValidatorPP)
      .next(new sfn.Choice(this, 'Validation Check')
        .when(sfn.Condition.not(sfn.Condition.stringEquals('$.plateStatus.Payload.body', 'VALIDATED')), validationFailure)
        .otherwise(validationSucceededMessage)
        .afterwards())
      .next(embeddingInfoRequest)
      .next(embeddingInfo)
      .next(new sfn.Choice(this, "Plate Arn Service")
        .when(sfn.Condition.stringMatches('$.embeddingInfo.Payload.body.Item.plateMethodArn', "arn:aws:lambda:*"), processPlateLambda)
        .when(sfn.Condition.stringMatches('$.embeddingInfo.Payload.body.Item.plateMethodArn', "arn:aws:batch:*"), processPlateBatch)
        .otherwise(plateArnFailure)
        .afterwards())
      .next(endpointStep)

    const logGroup = new logs.LogGroup(this, "ProcessPlateLogGroup");

    this.processPlateStateMachine = new sfn.StateMachine(
      this,
      "Process Plate StateMachine",
      {
        definition: processPlateStepFunctionDef,
        timeout: cdk.Duration.minutes(360),
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

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
import batch = require("@aws-cdk/aws-batch");

export interface ProcessPlateStackProps extends cdk.StackProps {
  messageLambda: lambda.Function;
  imageManagementLambda: lambda.Function;
  trainingConfigurationLambda: lambda.Function;
  batchSpotQueue: batch.JobQueue;
  batchOnDemandQueue: batch.JobQueue;
  dataBucket: s3.Bucket;
  defaultArtifactLambda: lambda.Function;
  artifactLambda: lambda.Function;
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
        messageId: sfn.JsonPath.stringAt("$.plateMessageId"),
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
    
    const validationFailure1 = new sfn.Fail(this, 'Validation Failed 1', {
      cause: 'Validation Failed',
      error: 'Validation did not return VALIDATED',
    });
    
    const validationSuccess1 = new sfn.Succeed(this, "Validation Succeeded 1", {
      comment: "Validation Suceeded"
    });
    
    const plateValidator = new tasks.LambdaInvoke(this, "Plate Validator", {
      lambdaFunction: props.imageManagementLambda,
      inputPath: '$.validatorInput',
      resultPath: '$.validatorOutput'
    });
    
    const describeStacksInput1 = new sfn.Pass(this, "DescribeStacksInput1", {
      parameters: {
        method: "createDescribeStacksArtifact",
        contextId: sfn.JsonPath.stringAt("$.plateId"),
        trainId: "origin"
      },
      resultPath: '$.describeStacksInput'
    });
    
    const describeStacksInjector1 = new tasks.LambdaInvoke(this, "DescribeStacksInjector1", {
      lambdaFunction: props.artifactLambda,
      inputPath: '$.describeStacksInput',
      resultPath: '$.describeStacks'
    });
    
    const artifactFunction = new tasks.LambdaInvoke(this, "Image Artifacts", {
      lambdaFunction: props.defaultArtifactLambda,
      outputPath: '$.Payload'
    });
    
      // maxConcurrency: 0,
      // parameters: {
      //   wellMethodArn: sfn.JsonPath.stringAt('$.embeddingInfo.Payload.body.Item.wellMethodArn'),
      //   'wellId.$' : "$$.Map.Item.Value",
      //   plateMessageId: sfn.JsonPath.stringAt("$.plateMessageId")
      // },
      // itemsPath: '$.wellList.Payload.body',
      // resultPath: '$.wellMapResult',

    
    const artifactMap = new sfn.Map(this, "Artifact Map", {
      maxConcurrency: 0,
      parameters: {
        'imageId.$' : "$$.Map.Item.Value.Item.imageId",
        describeStacks: sfn.JsonPath.stringAt("$.describeStacks")
      },
      itemsPath: '$.imageList.Payload.body',
      resultPath: '$.artifactMapResult',
    });
    artifactMap.iterator(artifactFunction);
    
    const artifactSequence = describeStacksInput1.next(describeStacksInjector1).next(artifactMap).next(validationSuccess1)

    const artifactChoice = new sfn.Choice(this, "ArtifactChoice")
        .when(sfn.Condition.stringMatches('$.validatorOutput.Payload.body', "VALIDATED"), artifactSequence)
        .when(sfn.Condition.stringMatches('$.validatorOutput.Payload.body', "READY"), validationSuccess1)
        .otherwise(validationFailure1);

    const uploadSourcePlateStepFunctionDef = plateValidatorInput
      .next(plateFormat1)
      .next(plateToImages1)
      .next(inspectorMap)
      .next(plateValidator)
      .next(artifactChoice)

    const uploadSourcePlateGroup = new logs.LogGroup(this, "UploadSourcePlateLogGroup");

    this.uploadSourcePlateStateMachine = new sfn.StateMachine(
      this,
      "Upload Source Plate StateMachine",
      {
        definition: uploadSourcePlateStepFunctionDef,
        timeout: cdk.Duration.minutes(60),
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
    
    const describeStacksInput2 = new sfn.Pass(this, "DescribeStacksInput2", {
      parameters: {
        method: "createDescribeStacksArtifact",
        contextId: sfn.JsonPath.stringAt("$.plateId"),
        trainId: "origin"
      },
      resultPath: '$.describeStacksInput'
    });
    
    const describeStacksInjector2 = new tasks.LambdaInvoke(this, "DescribeStacksInjector2", {
      lambdaFunction: props.artifactLambda,
      inputPath: '$.describeStacksInput',
      resultPath: '$.describeStacks'
    });
    
    const plateMessageInput = new sfn.Pass(this, "Plate Message Input", {
      parameters: {
        method: "getPlateMessageId",
        plateId: sfn.JsonPath.stringAt("$.plateId"),
      },
      resultPath: '$.plateMessageInput',
    });
    
    const getPlateMessage = new tasks.LambdaInvoke(this, "Get Plate Message", {
      lambdaFunction: props.imageManagementLambda,
      inputPath: '$.plateMessageInput',
      resultPath: '$.plateMessageId'
    });
    
    const plateMessagePass = new sfn.Pass(this, "PlateMessagePass", {
      parameters: {
        plateId: sfn.JsonPath.stringAt("$.plateId"),
        embeddingName: sfn.JsonPath.stringAt("$.embeddingName"),
        plateMessageId: sfn.JsonPath.stringAt("$.plateMessageId.Payload.body")
      }
    });

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
      resultPath: '$.embeddingInfo',
      inputPath: '$.embeddingInfoRequest',
    });

    const processPlateLambda = this.createSfnMessage("PlateLambda", "Placeholder Plate Lambda Task");
    
    const skippingPlateMessage = this.createSfnMessage("SkippingPlate", "No valid Arn for Plate processing - skipping");
    
    const processPlateBatch = new tasks.BatchSubmitJob (this, "PlateBatchJob", {
      jobDefinition: batch.JobDefinition.fromJobDefinitionArn(this, "PlateBatchJobDefArn", sfn.JsonPath.stringAt('$.embeddingInfo.Payload.body.Item.plateMethodArn')),
      jobName: sfn.JsonPath.stringAt('$.plateId'),
//      jobQueue: props.batchSpotQueue,
      jobQueue: props.batchOnDemandQueue,
      payload: {
        type: sfn.InputType.OBJECT,
        value: {
          regionArg: '--region',
          region: process.env.CDK_DEFAULT_REGION,
          bucketArg: '--bucket',
          bucket: props.dataBucket.bucketName,
          plateIdArg: '--plateId',
          plateId: sfn.JsonPath.stringAt('$.plateId'),
          embeddingNameArg: '--embeddingName',
          embeddingName: sfn.JsonPath.stringAt('$.embeddingName')
        }
      },
      resultPath: '$.plateBatchOutput'
    });
    
    const listWellsInput = new sfn.Pass(this, "ListWellsInput", {
      parameters: {
        method: "getWellsByPlateId",
        plateId: sfn.JsonPath.stringAt('$.plateId'),
      },
      resultPath: '$.listWellsInput'
    });
    
    const listWellsFunction = new tasks.LambdaInvoke(this, "ListWellsFunction", {
      lambdaFunction: props.imageManagementLambda,
      resultPath: '$.wellList',
      inputPath: '$.listWellsInput',
    });
    
    const listWells = listWellsInput.next(listWellsFunction);
    
    const processWellLambda = this.createSfnMessage("WellLambda", "Placeholder Well Lambda Task");
    const processWellBatch = this.createSfnMessage("WellBatch", "Placeholder Well Batch Task");
    const skippingWellMessage = this.createSfnMessage("SkippingWell", "No valid Arn for Well processing - skipping");

    // Example Arns
    // arn:aws:lambda:us-east-1:580829821648:function:BioimageSearchLabelStack-labelFunction58A4020A-1TEZ4YLWTTXDH
    // arn:aws:batch:us-east-1:580829821648:job-definition/platepreprocessingjobde-614a2d2923fd2c7:1
    
    const wellPass = new sfn.Pass(this, "WellPass", {
      parameters: {
        wellId: sfn.JsonPath.stringAt('$.wellId')
      }
    });
    
    const wellChoice = new sfn.Choice(this, "Well Arn Service")
        .when(sfn.Condition.stringMatches('$.wellMethodArn', "arn:aws:lambda:*"), processWellLambda)
        .when(sfn.Condition.stringMatches('$.wellMethodArn', "arn:aws:batch:*"), processWellBatch)
        .otherwise(skippingWellMessage)
        
    const wellProcessor = wellChoice.afterwards().next(wellPass)
        
    const wellMap = new sfn.Map(this, "Well Map", {
      maxConcurrency: 0,
      parameters: {
        wellMethodArn: sfn.JsonPath.stringAt('$.embeddingInfo.Payload.body.Item.wellMethodArn'),
        'wellId.$' : "$$.Map.Item.Value",
        plateMessageId: sfn.JsonPath.stringAt("$.plateMessageId")
      },
      itemsPath: '$.wellList.Payload.body',
      resultPath: '$.wellMapResult',
    });
    wellMap.iterator(wellProcessor);
    
    const listImagesInput = new sfn.Pass(this, "ListImagesInput", {
      parameters: {
        method: "getImageIdsByPlateId",
        plateId: sfn.JsonPath.stringAt('$.plateId'),
      },
      resultPath: '$.listImagesInput'
    });
    
    const listImagesFunction = new tasks.LambdaInvoke(this, "ListImagesFunction", {
      lambdaFunction: props.imageManagementLambda,
      resultPath: '$.imageList',
      inputPath: '$.listImagesInput',
    });
    
    const listImages = listImagesInput.next(listImagesFunction);
    
    const imageArnFailureMessage = this.createSfnMessage("ImageArnFailureMessage", "Invalid Image Arn");
    
    const imageArnFail = new sfn.Fail(this, 'Image Arn Selection Failed', {
      cause: 'Invalid Image Arn',
      error: 'Invalid Image Arn',
    });
    
    const imageArnFailure = imageArnFailureMessage.next(imageArnFail);
    
    const processImageLambda = this.createSfnMessage("ImageLambda", "Placeholder Image Lambda Task");
    
    const processImageBatch = new tasks.BatchSubmitJob (this, "ImageBatchJob", {
      jobDefinition: batch.JobDefinition.fromJobDefinitionArn(this, "ImageBatchJobDefArn", sfn.JsonPath.stringAt('$.imageMethodArn')),
      jobName: sfn.JsonPath.stringAt('$.imageId'),
//      jobQueue: props.batchSpotQueue,
      jobQueue: props.batchOnDemandQueue,
      payload: {
        type: sfn.InputType.OBJECT,
        value: {
          regionArg: '--region',
          region: process.env.CDK_DEFAULT_REGION,
          bucketArg: '--bucket',
          bucket: props.dataBucket.bucketName,
          imageIdArg: '--imageId',
          imageId: sfn.JsonPath.stringAt('$.imageId'),
          embeddingNameArg: '--embeddingName',
          embeddingName: sfn.JsonPath.stringAt('$.embeddingName'),
          describeStacksArg: '--describeStacks',
          describeStacks: sfn.JsonPath.stringAt('$.describeStacks.Payload.body.key')
        }
      },
      resultPath: '$.imageBatchOutput',
    });

    const imageChoice = new sfn.Choice(this, "Image Arn Service")
      .when(sfn.Condition.stringMatches('$.imageMethodArn', "arn:aws:lambda:*"), processImageLambda)
      .when(sfn.Condition.stringMatches('$.imageMethodArn', "arn:aws:batch:*"), processImageBatch)
      .otherwise(imageArnFailure);
      
    const imagePass = new sfn.Pass(this, "ImagePass", {
      parameters: {
        imageId: sfn.JsonPath.stringAt('$.imageId')
      }
    });
    
    const imageProcessor = imageChoice.afterwards().next(imagePass);
        
    const imageMap = new sfn.Map(this, "Image Map", {
      maxConcurrency: 0,
      parameters: {
        imageMethodArn: sfn.JsonPath.stringAt('$.embeddingInfo.Payload.body.Item.imageMethodArn'),
        'imageId.$' : "$$.Map.Item.Value",
        plateMessageId: sfn.JsonPath.stringAt("$.plateMessageId"),
        embeddingName: sfn.JsonPath.stringAt('$.embeddingName'),
        describeStacks: sfn.JsonPath.stringAt("$.describeStacks")
      },
      itemsPath: '$.imageList.Payload.body',
      resultPath: '$.imageMapResult',
    });
    imageMap.iterator(imageProcessor);

    
    const processPlateSuccess = new sfn.Succeed(this, "Process Plate Success", {
      comment: "Process Plate Suceeded"
    });
    
    const processPlateStepFunctionDef = plateMessageInput
      .next(getPlateMessage)
      .next(plateMessagePass)
      .next(startMessage)
      .next(plateValidatorInputPP)
      .next(plateValidatorPP)
      .next(new sfn.Choice(this, 'Validation Check')
        .when(sfn.Condition.not(sfn.Condition.stringEquals('$.plateStatus.Payload.body', 'VALIDATED')), validationFailure)
        .otherwise(validationSucceededMessage)
        .afterwards())
      .next(embeddingInfoRequest)
      .next(embeddingInfo)
      .next(describeStacksInput2)
      .next(describeStacksInjector2)
      .next(new sfn.Choice(this, "Plate Arn Service")
        .when(sfn.Condition.stringMatches('$.embeddingInfo.Payload.body.Item.plateMethodArn', "arn:aws:lambda:*"), processPlateLambda)
        .when(sfn.Condition.stringMatches('$.embeddingInfo.Payload.body.Item.plateMethodArn', "arn:aws:batch:*"), processPlateBatch)
        .otherwise(skippingPlateMessage)
        .afterwards())
      .next(listWells)
      .next(wellMap)
      .next(listImages)
      .next(imageMap)
      .next(processPlateSuccess)

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
        timeout: cdk.Duration.minutes(15),
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

  //////////////////////////////////////////
  
export function createTrainPlateVisitor(scope: cdk.Construct, 
                                        visitorName: string, 
                                        trainId: string, 
                                        plateProcessor: any,
                                        trainingConfigurationLambda: lambda.Function,
                                        imageManagementLambda: lambda.Function,
                                        processPlateLambda: lambda.Function) {
   const trainInfoRequest = new sfn.Pass(scope, (visitorName +"TrainInfoRequest"), {
      parameters: {
        method: "getTraining",
        trainId: sfn.JsonPath.stringAt("$.trainId"),
      },
      resultPath: '$.trainInfoRequest'
    });

    const trainInfo = new tasks.LambdaInvoke(scope, (visitorName+"TrainInfo"), {
      lambdaFunction: trainingConfigurationLambda,
      resultPath: '$.trainInfo',
      inputPath: '$.trainInfoRequest',
    });
    
    const embeddingInfoRequest = new sfn.Pass(scope, (visitorName+"EmbeddingInfoRequest"), {
      parameters: {
        method: "getEmbeddingInfo",
        embeddingName: sfn.JsonPath.stringAt('$.trainInfo.Payload.body.embeddingName')
      },
      resultPath: '$.embeddingInfoRequest'
    });
    
    const embeddingInfo = new tasks.LambdaInvoke(scope, (visitorName+"EmbeddingInfo"), {
      lambdaFunction: trainingConfigurationLambda,
      resultPath: sfn.JsonPath.stringAt('$.embeddingInfo'),
      inputPath: '$.embeddingInfoRequest',
    });

    const plateSurveyRequest = new sfn.Pass(scope, (visitorName+"PlateSurveyRequest"), {
      parameters: {
        method: "listCompatiblePlates",
        width: sfn.JsonPath.stringAt('$.embeddingInfo.Payload.body.Item.inputWidth'),
        height: sfn.JsonPath.stringAt('$.embeddingInfo.Payload.body.Item.inputHeight'),
        depth: sfn.JsonPath.stringAt('$.embeddingInfo.Payload.body.Item.inputDepth'),
        channels: sfn.JsonPath.stringAt('$.embeddingInfo.Payload.body.Item.inputChannels')
      },
      resultPath: '$.plateSurveyRequest'
    });
    
    const plateList = new tasks.LambdaInvoke(scope,(visitorName+"PlateList"), {
      lambdaFunction: imageManagementLambda,
      resultPath: sfn.JsonPath.stringAt('$.plateList'),
      inputPath: '$.plateSurveyRequest'
    });

    // ==Supplied as method parameter==
    // const plateProcessor = new tasks.LambdaInvoke(this, "Process Plate", {
    //   lambdaFunction: props.processPlateLambda,
    //   outputPath: '$.Payload.body'
    // });
    
    const plateWait = new sfn.Wait(scope, (visitorName+"PlateWait"), {
      time: sfn.WaitTime.duration(cdk.Duration.seconds(30))
    });
    
    const plateStatusInput = new sfn.Pass(scope, (visitorName+"PlateStatusInput"), {
      parameters: {
        method: "describeExecution",
        executionArn: sfn.JsonPath.stringAt('$.executionArn')
      }
    });
    
    const plateStatus = new tasks.LambdaInvoke(scope, (visitorName+"PlateStatus"), {
      lambdaFunction: processPlateLambda,
      outputPath: '$.Payload.body'      
    });
    
    const plateNotRunning = new sfn.Pass(scope, (visitorName+"Plate Not Running"), {
      parameters: {
        status: sfn.JsonPath.stringAt('$.status')
      }
    });
    
    const plateSequence = plateProcessor
      .next(plateWait)
      .next(plateStatusInput)
      .next(plateStatus)
      .next(new sfn.Choice(scope, (visitorName+"PlateSfnCompleteCheck"))
        .when(sfn.Condition.stringEquals('$.status', 'RUNNING'), plateWait)
        .otherwise(plateNotRunning));

    const plateProcessMap = new sfn.Map(scope, (visitorName+"PlateProcessMap"), {
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
    
    return trainInfoRequest
      .next(embeddingInfoRequest)
      .next(embeddingInfo)
      .next(plateSurveyRequest)
      .next(plateList)
      .next(plateProcessMap)
}

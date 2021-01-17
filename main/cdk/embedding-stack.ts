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

export interface EmbeddingStackProps extends cdk.StackProps {
  artifactLambda: lambda.Function;
  messageLambda: lambda.Function;
  imageManagementLambda: lambda.Function;
  trainingConfigurationLambda: lambda.Function;
  dataBucket: s3.Bucket;
}

export class EmbeddingStack extends cdk.Stack {
  public plateEmbeddingComputeLambda: lambda.Function;
  public embeddingManagementLambda: lambda.Function;
  public plateEmbeddingComputeStateMachine: sfn.StateMachine;
  public embeddingComputeStateMachine: sfn.StateMachine;

  constructor(app: cdk.App, id: string, props: EmbeddingStackProps) {
    super(app, id, props);
    
    this.plateEmbeddingComputeLambda = new lambda.DockerImageFunction(
      this,
      "plateEmbeddingComputeFunction",
      {
        code: lambda.DockerImageCode.fromImageAsset("src/embedding-compute"),
        memorySize: 3008,
        timeout: cdk.Duration.minutes(15),
        environment: {
          ARTIFACT_LAMBDA_ARN: props.artifactLambda.functionArn,
          MESSAGE_LAMBDA_ARN: props.messageLambda.functionArn,
          IMAGE_MANAGEMENT_LAMBDA_ARN: props.imageManagementLambda.functionArn,
          TRAINING_CONFIGURATION_LAMBDA_ARN: props.trainingConfigurationLambda.functionArn,
          BUCKET: props.dataBucket.bucketName
        },
      }
    );
    
    this.embeddingManagementLambda = new lambda.Function(
      this,
      "embeddingManagementFunction",
      {
        code: lambda.Code.fromAsset("src/embedding-management/build"),
        handler: "embedding-management.handler",
        runtime: lambda.Runtime.NODEJS_12_X,
        memorySize: 256,
        timeout: cdk.Duration.minutes(3),
      }
    );
    
    ///////////////////////////////////////////
    //
    // Plate Embedding Compute State Machine
    //
    ///////////////////////////////////////////

    const imagesByPlateInput = new sfn.Pass(this, "ImagesByPlateInput", {
      parameters: {
        method: "getImageIdsByPlateId",
        plateId: sfn.JsonPath.stringAt("$.plateId"),
      },
      resultPath: '$.getImagesInput',
    });

    const plateToImages = new tasks.LambdaInvoke(this, "Plate To Images", {
      lambdaFunction: props.imageManagementLambda,
      inputPath: '$.getImagesInput',
      resultPath: '$.imageList'
    });
    
    const trainInfoInput1 = new sfn.Pass(this, "TrainInfoInput1", {
      parameters: {
        method: "getTraining",
        trainId: sfn.JsonPath.stringAt("$.trainId"),
      },
      resultPath: '$.getTrainInfoInput',
    });
    
    const getTrainInfo1 = new tasks.LambdaInvoke(this, "GetTrainInfo1", {
      lambdaFunction: props.trainingConfigurationLambda,
      inputPath: '$.getTrainInfoInput',
      resultPath: '$.trainInfo'
    });
    
    const trainingJobInfoInput = new sfn.Pass(this, "TrainingJobInfoInput", {
      parameters: {
        method: "getTrainingJobInfo",
        trainingJobName: sfn.JsonPath.stringAt("$.trainInfo.Payload.body.sagemakerJobName"),
      },
      resultPath: '$.getTrainingJobInfoInput',
    });
    
    const trainingJobInfo = new tasks.LambdaInvoke(this, "TrainingJobInfo", {
      lambdaFunction: props.trainingConfigurationLambda,
      inputPath: '$.getTrainingJobInfoInput',
      resultPath: '$.trainingJobInfo'
    });
    
    const embeddingInfoInput1 = new sfn.Pass(this, "EmbeddingInfoInput1", {
      parameters: {
        method: "getEmbeddingInfo",
        embeddingName: sfn.JsonPath.stringAt("$.trainInfo.Payload.body.embeddingName")
      },
      resultPath: '$.getEmbeddingInfoInput',
    });
    
    const getEmbeddingInfo1 = new tasks.LambdaInvoke(this, "GetEmbeddingInfo1", {
      lambdaFunction: props.trainingConfigurationLambda,
      inputPath: '$.getEmbeddingInfoInput',
      resultPath: '$.embeddingInfo'
    });

    const imageRoiEmbeddingCompute = new tasks.LambdaInvoke(this, "Image Roi Embedding Compute", {
      lambdaFunction: this.plateEmbeddingComputeLambda,
      outputPath: '$.Payload'
    });

    const plateEmbeddingComputeMap = new sfn.Map(this, "Plate Embedding Compute Map", {
      maxConcurrency: 10,
      parameters: {
        'imageId.$' : "$$.Map.Item.Value",
        'plateId.$' : '$.plateId',
        'trainInfo.$' : '$.trainInfo.Payload.body',
        'trainingJobInfo.$' : '$.trainingJobInfo.Payload.body',
        'embeddingInfo.$' : '$.embeddingInfo.Payload.body.Item'
      },
      itemsPath: '$.imageList.Payload.body',
      resultPath: '$.inspectorMapResult',
    });
    plateEmbeddingComputeMap.iterator(imageRoiEmbeddingCompute);
    
    const plateEmbeddingComputeStepFunctionDef = imagesByPlateInput
      .next(plateToImages)
      .next(trainInfoInput1)
      .next(getTrainInfo1)
      .next(trainingJobInfoInput)
      .next(trainingJobInfo)
      .next(embeddingInfoInput1)
      .next(getEmbeddingInfo1)
      .next(plateEmbeddingComputeMap)

//    const embeddingComputeLogGroup = new logs.LogGroup(this, "EmbeddingComputeLogGroup");

    this.plateEmbeddingComputeStateMachine = new sfn.StateMachine(
      this,
      "Plate Embedding Compute StateMachine",
      {
        definition: plateEmbeddingComputeStepFunctionDef,
        timeout: cdk.Duration.minutes(60),
        // logs: {
        //   destination: embeddingComputeLogGroup,
        //   level: sfn.LogLevel.ALL,
        // },
      }
    );
    
    ///////////////////////////////////////////
    //
    // Embedding Compute State Machine
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
    
    const plateProcessor = new tasks.StepFunctionsStartExecution(this, "Plate Embedding Compute SFN", {
      stateMachine: this.plateEmbeddingComputeStateMachine,
    });
    
    const plateWait = new sfn.Wait(this, "Plate Wait", {
      time: sfn.WaitTime.duration(cdk.Duration.seconds(30))
    });
    
    const plateStatusInput = new sfn.Pass(this, "Plate Status Input", {
      parameters: {
        method: "describeExecution",
        ExecutionArn: sfn.JsonPath.stringAt('$.ExecutionArn')
      }
    });
    
    const plateStatus = new tasks.LambdaInvoke(this, "Plate Status", {
      lambdaFunction: this.embeddingManagementLambda,
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

    const embeddingComputeMap = new sfn.Map(this, "Embedding Compute Map", {
      maxConcurrency: 10,
      itemsPath: '$.plateList.Payload.body',
      resultPath: '$.embeddingComputeMapResult',
      parameters: {
        method: "startComputePlateEmbedding",
        'trainId.$' : '$.trainId',
        'plateId.$' : "$$.Map.Item.Value.plateId"
      }
    });
    embeddingComputeMap.iterator(plateSequence);
    
    const embeddingStepFunctionDef = trainInfoRequest
      .next(trainInfo)
      .next(embeddingInfoRequest)
      .next(embeddingInfo)
      .next(plateSurveyRequest)
      .next(plateList)
      .next(embeddingComputeMap)

    this.embeddingComputeStateMachine = new sfn.StateMachine(
      this,
      "EmbeddingComputeStateMachine",
      {
        definition: embeddingStepFunctionDef,
        timeout: cdk.Duration.hours(24),
      }
    );


  }
}

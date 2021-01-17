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
  public embeddingComputeLambda: lambda.Function;
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
        environment: {
          EMBEDDING_COMPUTE_SFN_ARN: this.embeddingComputeStateMachine.stateMachineArn,
          PLATE_EMBEDDING_COMPUTE_SFN_ARN: this.plateEmbeddingComputeStateMachines.stateMachineArn
        },
      }
    );
    
    ///////////////////////////////////////////
    //
    // Embedding Compute State Machine
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
      lambdaFunction: this.embeddingComputeLambda,
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

  }
}

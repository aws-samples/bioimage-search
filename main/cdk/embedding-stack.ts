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
  public embeddingComputeStateMachine: sfn.StateMachine;

  constructor(app: cdk.App, id: string, props: EmbeddingStackProps) {
    super(app, id, props);
    
    this.embeddingComputeLambda = new lambda.DockerImageFunction(
      this,
      "embeddingComputeFunction",
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
    
    const trainInfoInput = new sfn.Pass(this, "TrainInfoInput", {
      parameters: {
        method: "getTraining",
        trainId: sfn.JsonPath.stringAt("$.trainId"),
      },
      resultPath: '$.getTrainInfoInput',
    });
    
    const getTrainInfo = new tasks.LambdaInvoke(this, "GetTrainInfo", {
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
    
    const embeddingInfoInput = new sfn.Pass(this, "EmbeddingInfoInput", {
      parameters: {
        method: "getEmbeddingInfo",
        embeddingName: sfn.JsonPath.stringAt("$.trainInfo.Payload.body.embeddingName")
      },
      resultPath: '$.getEmbeddingInfoInput',
    });
    
    const getEmbeddingInfo = new tasks.LambdaInvoke(this, "GetEmbeddingInfo", {
      lambdaFunction: props.trainingConfigurationLambda,
      inputPath: '$.getEmbeddingInfoInput',
      resultPath: '$.embeddingInfo'
    });

    const imageRoiEmbeddingCompute = new tasks.LambdaInvoke(this, "Image Roi Embedding Compute", {
      lambdaFunction: this.embeddingComputeLambda,
      outputPath: '$.Payload'
    });

    const embeddingComputeMap = new sfn.Map(this, "Embedding Compute Map", {
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
    embeddingComputeMap.iterator(imageRoiEmbeddingCompute);
    
    const embeddingComputeStepFunctionDef = imagesByPlateInput
      .next(plateToImages)
      .next(trainInfoInput)
      .next(getTrainInfo)
      .next(trainingJobInfoInput)
      .next(trainingJobInfo)
      .next(embeddingInfoInput)
      .next(getEmbeddingInfo)
      .next(embeddingComputeMap)

//    const embeddingComputeLogGroup = new logs.LogGroup(this, "EmbeddingComputeLogGroup");

    this.embeddingComputeStateMachine = new sfn.StateMachine(
      this,
      "Embedding Compute StateMachine",
      {
        definition: embeddingComputeStepFunctionDef,
        timeout: cdk.Duration.minutes(60),
        // logs: {
        //   destination: embeddingComputeLogGroup,
        //   level: sfn.LogLevel.ALL,
        // },
      }
    );

  }
}

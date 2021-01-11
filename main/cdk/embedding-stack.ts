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

    const imageRoiEmbeddingCompute = new tasks.LambdaInvoke(this, "Image Roi Embedding Compute", {
      lambdaFunction: this.embeddingComputeLambda,
      outputPath: '$.Payload'
    });

    const embeddingComputeMap = new sfn.Map(this, "Embedding Compute Map", {
      maxConcurrency: 0,
      itemsPath: '$.imageList.Payload.body',
      resultPath: '$.inspectorMapResult',
    });
    embeddingComputeMap.iterator(imageRoiEmbeddingCompute);
    
    const embeddingComputeStepFunctionDef = plateFormat1
      .next(plateToImages1)
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

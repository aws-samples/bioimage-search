import lambda = require("@aws-cdk/aws-lambda");
import iam = require("@aws-cdk/aws-iam");
import cdk = require("@aws-cdk/core");
import * as sqs from '@aws-cdk/aws-sqs';
import ecs = require("@aws-cdk/aws-ecs")
import ec2 = require("@aws-cdk/aws-ec2");


export interface SearchStackProps extends cdk.StackProps {
  trainingConfigurationLambda: lambda.Function;
  imageManagementLambda: lambda.Function;
  processPlateLambda: lambda.Function;
  messageLambda: lambda.Function;
  searchLambda: lambda.Function;
  tagLambda: lambda.Function;
  searchQueue: sqs.Queue;
  managementQueue: sqs.Queue;
  vpc: ec2.Vpc;
  region: string;
}

export class SearchServiceStack extends cdk.Stack {
  public searchTaskDefinition: ecs.TaskDefinition;

  constructor(app: cdk.App, id: string, props: SearchStackProps) {
    super(app, id, props);

    this.searchTaskDefinition = new ecs.FargateTaskDefinition(this, 'BioimsSearchTaskDef', {
      memoryLimitMiB: 2048,
      cpu: 1024,
    });

    const searchContainer = this.searchTaskDefinition.addContainer("BioimsSearchContainer", {
      image: ecs.ContainerImage.fromAsset('src/search-service'),
      environment: {
          TRAINING_CONFIGURATION_LAMBDA_ARN: props.trainingConfigurationLambda.functionArn,
          MESSAGE_LAMBDA_ARN: props.messageLambda.functionArn,
          SEARCH_LAMBDA_ARN: props.searchLambda.functionArn,
          TAG_LAMBDA_ARN: props.tagLambda.functionArn,
          SEARCH_QUEUE_URL: props.searchQueue.queueUrl,
          MANAGEMENT_QUEUE_URL: props.managementQueue.queueUrl,
          REGION: props.region
      },
      logging: ecs.LogDrivers.awsLogs({ streamPrefix: 'BioimsSearchContainer' })
    });
    
    const searchCluster = new ecs.Cluster(this, 'BioimsSearchCluster', {
      vpc: props.vpc
    });

    const searchService = new ecs.FargateService(this, 'BioimsSearchService', {
      cluster: searchCluster,
      taskDefinition: this.searchTaskDefinition,
      desiredCount: 1
    });
    
  }
  
}

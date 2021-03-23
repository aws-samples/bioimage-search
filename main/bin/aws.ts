import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import iam = require('@aws-cdk/aws-iam');
import s3 = require('@aws-cdk/aws-s3');
import * as sqs from '@aws-cdk/aws-sqs';
import * as Dynamodb from 'aws-sdk/clients/dynamodb';
import { SharedIniFileCredentials } from 'aws-sdk';

import { BaseStack } from '../cdk/base-stack';
import { LustreStack } from '../cdk/lustre-stack';
import { BatchSetupStack } from '../cdk/batch-setup-stack';
import { ConfigurationStack } from '../cdk/configuration-stack';
import { LabelStack } from '../cdk/label-stack';
import { MessageStack } from '../cdk/message-stack';
import { ImageArtifactStack } from '../cdk/image-artifact-stack';
import { ResourcePermissionsStack } from '../cdk/resource-permissions-stack';
import { PlatePreprocessingStack } from '../cdk/plate-preprocessing-stack';
import { ImagePreprocessingStack } from '../cdk/image-preprocessing-stack';
import { TrainingConfigurationStack } from '../cdk/training-configuration-stack';
import { ArtifactStack } from '../cdk/artifact-stack';
import { ImageManagementStack } from '../cdk/image-management-stack';
import { ProcessPlateStack } from '../cdk/process-plate-stack';
import { TrainStack } from '../cdk/train-stack';
import { EmbeddingStack } from '../cdk/embedding-stack';
import { SearchStack } from '../cdk/search-stack';
import { SearchServiceStack } from '../cdk/search-service-stack';
import { TagStack } from '../cdk/tag-stack';

const region = process.env.CDK_DEFAULT_REGION || "";

const credentials = new SharedIniFileCredentials({profile: 'default'});
const dynamodb = new Dynamodb({
    region: region,
    credentials: credentials
});

// Buckets to be created by the user and configured here:
const RESOURCE_BUCKET = "bioims-resource-1";
const DATA_BUCKET = "bioims-data-1";
const BBBC021_BUCKET = "bioimagesearchbbbc021stack-bbbc021bucket544c3e64-ugln15rb234b";

(async() => {

const dynamoTables = await dynamodb.listTables().promise();
const dynamoTableNames = dynamoTables!.TableNames

const app = new cdk.App();

const baseStack = new BaseStack(app, 'BioimageSearchBaseStack', {
    dataBucketName: DATA_BUCKET,
})

const lustreStack = new LustreStack(app, 'BioimageSearchLustreStack', {
    bioimsVpc: baseStack.vpc,
    dataBucket: baseStack.dataBucket
})

const batchSetupStack = new BatchSetupStack(app, 'BioimageSearchBatchSetupStack');

const configurationStack = new ConfigurationStack(app, 'BioimageSearchConfigurationStack', {
    dynamoTableNames: dynamoTableNames
})

const labelStack = new LabelStack(app, 'BioimageSearchLabelStack', {
    dynamoTableNames: dynamoTableNames
})

const messageStack = new MessageStack(app, 'BioimageSearchMessageStack', {
    dynamoTableNames: dynamoTableNames
})

const artifactStack = new ArtifactStack(app, 'BioimageSearchArtifactStack', {
    dynamoTableNames: dynamoTableNames,
    dataBucket: baseStack.dataBucket
})

const imageArtifactStack = new ImageArtifactStack(app, 'BioimageSearchImageArtifactStack', {
    dataBucket: baseStack.dataBucket,
    configurationLambdaArn: configurationStack.configurationLambdaArn,
    artifactLambdaArn: artifactStack.artifactLambda.functionArn
})

const platePreprocessingStack = new PlatePreprocessingStack(app, 'BioimageSearchPlatePreprocessingStack', {
    batchInstanceRole: batchSetupStack.batchInstanceRole
})

const imagePreprocessingStack = new ImagePreprocessingStack(app, 'BioimageSearchImagePreprocessingStack');

const trainingConfigurationStack = new TrainingConfigurationStack(app, 'BioimageSearchTrainingConfigurationStack', {
    dynamoTableNames: dynamoTableNames
})

const imageManagementStack = new ImageManagementStack(app, 'BioimageSearchImageManagementStack', {
    trainingConfigurationLambda: trainingConfigurationStack.trainingConfigurationLambda,
    messageLambda: messageStack.messageLambda,
    artifactLambda: artifactStack.artifactLambda,
    dynamoTableNames: dynamoTableNames
})

const processPlateStack = new ProcessPlateStack(app, 'BioimageSearchProcessPlateStack', {
    messageLambda: messageStack.messageLambda,
    imageManagementLambda: imageManagementStack.imageManagementLambda,
    trainingConfigurationLambda: trainingConfigurationStack.trainingConfigurationLambda,
    batchSpotQueue: batchSetupStack.batchSpotQueue,
    batchOnDemandQueue: batchSetupStack.batchOnDemandQueue,
    dataBucket: baseStack.dataBucket,
    defaultArtifactLambda: imageArtifactStack.defaultArtifactLambda,
    artifactLambda: artifactStack.artifactLambda
})

const trainStack = new TrainStack(app, 'BioimageSearchTrainStack', {
    messageLambda: messageStack.messageLambda,
    imageManagementLambda: imageManagementStack.imageManagementLambda,
    trainingConfigurationLambda: trainingConfigurationStack.trainingConfigurationLambda,
    processPlateLambda: processPlateStack.processPlateLambda,
    artifactLambda: artifactStack.artifactLambda,
    dataBucket: baseStack.dataBucket
})

const embeddingStack = new EmbeddingStack(app, 'BioimageSearchEmbeddingStack', {
    artifactLambda: artifactStack.artifactLambda,
    messageLambda: messageStack.messageLambda,
    imageManagementLambda: imageManagementStack.imageManagementLambda,
    trainingConfigurationLambda: trainingConfigurationStack.trainingConfigurationLambda,
    dataBucket: baseStack.dataBucket
})

const searchStack = new SearchStack(app, 'BioimageSearchSearchStack', {
    trainingConfigurationLambda: trainingConfigurationStack.trainingConfigurationLambda,
    imageManagementLambda: imageManagementStack.imageManagementLambda,
    processPlateLambda: processPlateStack.processPlateLambda,
    messageLambda: messageStack.messageLambda,
    dynamoTableNames: dynamoTableNames,
    region: region
})

const tagStack = new TagStack(app, 'BioimageSearchTagStack', {
    dynamoTableNames: dynamoTableNames
})

const searchServiceStack = new SearchServiceStack(app, 'BioimageSearchServiceStack', {
    trainingConfigurationLambda: trainingConfigurationStack.trainingConfigurationLambda,
    imageManagementLambda: imageManagementStack.imageManagementLambda,
    processPlateLambda: processPlateStack.processPlateLambda,
    messageLambda: messageStack.messageLambda,
    searchLambda: searchStack.searchLambda,
    tagLambda: tagStack.tagLambda,
    searchQueue: searchStack.searchQueue,
    managementQueue: searchStack.managementQueue,
    vpc: batchSetupStack.batchVpc,
    region: region
})

const resourcePermissionsStack = new ResourcePermissionsStack(app, 'BioimageSearchResourcePermissionsStack', {
    dataBucket: baseStack.dataBucket,
    bbbc021BucketName: BBBC021_BUCKET,
    resourceBucketName: RESOURCE_BUCKET,
    batchInstanceRole: batchSetupStack.batchInstanceRole,
    configurationLambdaArn: configurationStack.configurationLambdaArn,
    labelLambdaArn: labelStack.labelLambdaArn,
    messageLambda: messageStack.messageLambda,
    defaultArtifactLambda: imageArtifactStack.defaultArtifactLambda,
    trainingConfigurationLambda: trainingConfigurationStack.trainingConfigurationLambda,
    artifactLambda: artifactStack.artifactLambda,
    imageManagementLambda: imageManagementStack.imageManagementLambda,
    imageInspectorLambda: processPlateStack.imageInspectorLambda,
    processPlateLambda: processPlateStack.processPlateLambda,
    processPlateStateMachine: processPlateStack.processPlateStateMachine,
    uploadSourcePlateStateMachine: processPlateStack.uploadSourcePlateStateMachine,
    trainLambda: trainStack.trainLambda,
    trainStateMachine: trainStack.trainStateMachine,
    trainBuildLambda: trainStack.trainBuildLambda,
    trainComputeLambda: trainStack.trainComputeLambda,
    plateEmbeddingComputeLambda: embeddingStack.plateEmbeddingComputeLambda,
    embeddingManagementLambda: embeddingStack.embeddingManagementLambda,
    searchLambda: searchStack.searchLambda,
    searchQueue: searchStack.searchQueue,
    managementQueue: searchStack.managementQueue,
    searchTaskDefinition: searchServiceStack.searchTaskDefinition,
    searchTrainLoaderStateMachine: searchStack.searchTrainLoaderStateMachine,
    searchTagLoaderStateMachine: searchStack.searchTagLoaderStateMachine,
    tagLambda: tagStack.tagLambda
})

})();

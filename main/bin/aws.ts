import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import iam = require('@aws-cdk/aws-iam');
import s3 = require('@aws-cdk/aws-s3');
import { BaseStack } from '../cdk/base-stack';
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
import * as Dynamodb from 'aws-sdk/clients/dynamodb';
import { SharedIniFileCredentials } from 'aws-sdk';

const credentials = new SharedIniFileCredentials({profile: 'default'});
const dynamodb = new Dynamodb({
    region: process.env.CDK_DEFAULT_REGION,
    credentials: credentials
});

(async() => {

const dynamoTables = await dynamodb.listTables().promise();
const dynamoTableNames = dynamoTables!.TableNames

const app = new cdk.App();

const baseStack = new BaseStack(app, 'BioimageSearchBaseStack');

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

const imageArtifactStack = new ImageArtifactStack(app, 'BioimageSearchImageArtifactStack');

const platePreprocessingStack = new PlatePreprocessingStack(app, 'BioimageSearchPlatePreprocessingStack');

const imagePreprocessingStack = new ImagePreprocessingStack(app, 'BioimageSearchImagePreprocessingStack');

const trainingConfigurationStack = new TrainingConfigurationStack(app, 'BioimageSearchTrainingConfigurationStack', {
    dynamoTableNames: dynamoTableNames
})

const artifactStack = new ArtifactStack(app, 'BioimageSearchArtifactStack', {
    dynamoTableNames: dynamoTableNames
})

const imageManagementStack = new ImageManagementStack(app, 'BioimageSearchImageManagementStack', {
    trainingConfigurationLambda: trainingConfigurationStack.trainingConfigurationLambda,
    messageLambda: messageStack.messageLambda,
    artifactLambdaArn: artifactStack.artifactLambdaArn,
    dynamoTableNames: dynamoTableNames
})

const processPlateStack = new ProcessPlateStack(app, 'BioimageSearchProcessPlateStack', {
    messageLambda: messageStack.messageLambda,
    imageManagementLambda: imageManagementStack.imageManagementLambda,
    trainingConfigurationLambda: trainingConfigurationStack.trainingConfigurationLambda,
    batchSpotQueue: batchSetupStack.batchSpotQueue
})

const trainStack = new TrainStack(app, 'BioimageSearchTrainStack', {
    messageLambda: messageStack.messageLambda,
    imageManagementLambda: imageManagementStack.imageManagementLambda,
    trainingConfigurationLambda: trainingConfigurationStack.trainingConfigurationLambda,
    processPlateLambda: processPlateStack.processPlateLambda
})

const resourcePermissionsStack = new ResourcePermissionsStack(app, 'BioimageSearchResourcePermissionsStack', {
    dataBucket: baseStack.dataBucket,
    batchInstanceRole: batchSetupStack.batchInstanceRole,
    configurationLambdaArn: configurationStack.configurationLambdaArn,
    labelLambdaArn: labelStack.labelLambdaArn,
    messageLambda: messageStack.messageLambda,
    defaultArtifactLambda: imageArtifactStack.defaultArtifactLambda,
    trainingConfigurationLambda: trainingConfigurationStack.trainingConfigurationLambda,
    artifactLambdaArn: artifactStack.artifactLambdaArn,
    imageManagementLambda: imageManagementStack.imageManagementLambda,
    imageInspectorLambda: processPlateStack.imageInspectorLambda,
    processPlateLambda: processPlateStack.processPlateLambda,
    processPlateStateMachine: processPlateStack.processPlateStateMachine,
    uploadSourcePlateStateMachine: processPlateStack.uploadSourcePlateStateMachine,
    trainLambda: trainStack.trainLambda,
    trainStateMachine: trainStack.trainStateMachine
})

})();

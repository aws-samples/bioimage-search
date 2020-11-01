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
import { EmbeddingConfigurationStack } from '../cdk/embedding-configuration-stack';
import { TrainingConfigurationStack } from '../cdk/training-configuration-stack';
import { ArtifactStack } from '../cdk/artifact-stack';
import { ImageManagementStack } from '../cdk/image-management-stack';

const app = new cdk.App();

const baseStack = new BaseStack(app, 'BioimageSearchBaseStack');

const batchSetupStack = new BatchSetupStack(app, 'BioimageSearchBatchSetupStack', {
    bioimageSearchManagedPolicy: baseStack.bioimageSearchManagedPolicy  
})

const resourcePermissionsStack = new ResourcePermissionsStack(app, 'BioimageSearchResourcePermissionsStack', {
    bioimageSearchManagedPolicy: baseStack.bioimageSearchManagedPolicy,
    resourcePermissionsPolicy: baseStack.externalResourcesPolicy
})

const configurationStack = new ConfigurationStack(app, 'BioimageSearchConfigurationStack', {
    bioimageSearchManagedPolicy: baseStack.bioimageSearchManagedPolicy
})

const labelStack = new LabelStack(app, 'BioimageSearchLabelStack', {
    bioimageSearchManagedPolicy: baseStack.bioimageSearchManagedPolicy
})

const messageStack = new MessageStack(app, 'BioimageSearchMessageStack', {
    bioimageSearchManagedPolicy: baseStack.bioimageSearchManagedPolicy
})

const imageArtifactStack = new ImageArtifactStack(app, 'BioimageSearchImageArtifactStack', {
    bioimageSearchManagedPolicy: baseStack.bioimageSearchManagedPolicy,
    externalResourcesPolicy: baseStack.externalResourcesPolicy
})

const platePreprocessingStack = new PlatePreprocessingStack(app, 'BioimageSearchPlatePreprocessingStack', {
    bioimageSearchManagedPolicy: baseStack.bioimageSearchManagedPolicy,
})

const imagePreprocessingStack = new ImagePreprocessingStack(app, 'BioimageSearchImagePreprocessingStack', {
    bioimageSearchManagedPolicy: baseStack.bioimageSearchManagedPolicy,
})

const embeddingConfigurationStack = new EmbeddingConfigurationStack(app, 'BioimageSearchEmbeddingConfigurationStack', {
    bioimageSearchManagedPolicy: baseStack.bioimageSearchManagedPolicy
})

const trainingConfigurationStack = new TrainingConfigurationStack(app, 'BioimageSearchTrainingConfigurationStack', {
    bioimageSearchManagedPolicy: baseStack.bioimageSearchManagedPolicy
})

const artifactStack = new ArtifactStack(app, 'BioimageSearchArtifactStack', {
    bioimageSearchManagedPolicy: baseStack.bioimageSearchManagedPolicy
})

const imageManagementStack = new ImageManagementStack(app, 'BioimageSearchImageManagementStack', {
    bioimageSearchManagedPolicy: baseStack.bioimageSearchManagedPolicy,
    trainingConfigurationLambdaArn: trainingConfigurationStack.trainingConfigurationLambdaArn,
    externalResourcesPolicy: baseStack.externalResourcesPolicy
})

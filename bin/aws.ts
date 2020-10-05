import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import iam = require('@aws-cdk/aws-iam');
import s3 = require('@aws-cdk/aws-s3');
import { BaseStack } from '../cdk/base-stack';
import { Bbbc021Stack } from '../cdk/bbbc-021-stack';
import { BatchSetupStack } from '../cdk/batch-setup-stack';
import { ConfigurationStack } from '../cdk/configuration-stack';
import { LabelStack } from '../cdk/label-stack';
import { MessageStack } from '../cdk/message-stack';
import { ImageArtifactStack } from '../cdk/image-artifact-stack';
import { ResourcePermissionsStack } from '../cdk/resource-permissions-stack';
import { PlatePreprocessingStack } from '../cdk/plate-preprocessing-stack';

const app = new cdk.App();

const baseStack = new BaseStack(app, 'BioimageSearchBaseStack');

const bbbc021Stack = new Bbbc021Stack(app, 'BioimageSearchBbbc021Stack')

const batchSetupStack = new BatchSetupStack(app, 'BioimageSearchBatchSetupStack', {
    bioimageSearchAccessPolicy: baseStack.bioimageSearchAccessPolicy  
})

const resourcePermissionsStack = new ResourcePermissionsStack(app, 'ResourcePermissionsStack', {
    bioimageSearchAccessPolicy: baseStack.bioimageSearchAccessPolicy,
    resourcePermissionsPolicy: baseStack.externalResourcesPolicy
})

const configurationStack = new ConfigurationStack(app, 'BioimageSearchConfigurationStack', {
    bioimageSearchAccessPolicy: baseStack.bioimageSearchAccessPolicy
})

const labelStack = new LabelStack(app, 'BioimageSearchLabelStack', {
    bioimageSearchAccessPolicy: baseStack.bioimageSearchAccessPolicy
})

const messageStack = new MessageStack(app, 'BioimageSearchMessageStack', {
    bioimageSearchAccessPolicy: baseStack.bioimageSearchAccessPolicy
})

const imageArtifactStack = new ImageArtifactStack(app, 'BioimageSearchImageArtifactStack', {
    bioimageSearchAccessPolicy: baseStack.bioimageSearchAccessPolicy,
    externalResourcesPolicy: baseStack.externalResourcesPolicy
})

const platePreprocessingStack = new PlatePreprocessingStack(app, 'BioimageSearchPlatePreprocessingStack', {
    bioimageSearchAccessPolicy: baseStack.bioimageSearchAccessPolicy,
})



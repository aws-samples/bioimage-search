import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import iam = require('@aws-cdk/aws-iam');
import s3 = require('@aws-cdk/aws-s3');
import { BaseStack } from '../cdk/base-stack';
import { Bbbc021Stack } from '../cdk/bbbc-021-stack';
import { ConfigurationStack } from '../cdk/configuration-stack';


const app = new cdk.App();

const base = new BaseStack(app, 'BioimageSearchBaseStack');

const bbbc021 = new Bbbc021Stack(app, 'BioimageSearchBbbc021Stack')

const configuration = new ConfigurationStack(app, 'BioimageSearchConfigurationStack', {
    bioimageSearchAccessPolicy: base.bioimageSearchAccessPolicy
})


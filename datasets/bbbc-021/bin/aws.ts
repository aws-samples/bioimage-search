import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import iam = require('@aws-cdk/aws-iam');
import s3 = require('@aws-cdk/aws-s3');
import { Bbbc021Stack } from '../cdk/bbbc-021-stack';

const app = new cdk.App();

const bbbc021Stack = new Bbbc021Stack(app, 'BioimageSearchBbbc021Stack')

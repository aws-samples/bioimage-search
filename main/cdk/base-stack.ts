import * as cdk from "@aws-cdk/core";
import ec2 = require("@aws-cdk/aws-ec2");
import iam = require("@aws-cdk/aws-iam");
import s3 = require("@aws-cdk/aws-s3");
import apigateway = require("@aws-cdk/aws-apigateway");
import s3assets = require("@aws-cdk/aws-s3-assets");
import fs = require("fs");

export class BaseStack extends cdk.Stack {
  public testBucket: s3.Bucket;

  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    
    this.testBucket = new s3.Bucket(this, 'BioimageSearchTestBucket', {
          blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL
    });

    const testBucketOutput = new cdk.CfnOutput(this, 'testBucket', { value: this.testBucket.bucketName } )

    // VPC will go here
  }
  
}

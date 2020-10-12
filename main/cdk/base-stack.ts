import * as cdk from "@aws-cdk/core";
import ec2 = require("@aws-cdk/aws-ec2");
import iam = require("@aws-cdk/aws-iam");
import s3 = require("@aws-cdk/aws-s3");
import apigateway = require("@aws-cdk/aws-apigateway");
import s3assets = require("@aws-cdk/aws-s3-assets");
import fs = require("fs");

export class BaseStack extends cdk.Stack {
  public bioimageSearchAccessPolicy: iam.Policy;
  public externalResourcesPolicy: iam.Policy;
  public testBucket: s3.Bucket;
  public testBucketRole: iam.Role;

  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this.bioimageSearchAccessPolicy = new iam.Policy(this, "biomageSearchAccessPolicy");
    
    this.externalResourcesPolicy = new iam.Policy(this, "externalResourcesPolicy");
    
    const cloudFormationPolicyStatement = new iam.PolicyStatement({
      actions: [
          "cloudformation:Describe*",
          "cloudformation:List*",
          "cloudformation:Get*"
      ],
      effect: iam.Effect.ALLOW,
      resources: [ "*" ]
    })
    
    this.testBucket = new s3.Bucket(this, 'BioimageSearchTestBucket', {
          blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL
    });

    const testBucketPolicyStatement = new iam.PolicyStatement({
      actions: [
          "s3:*",
      ],
      effect: iam.Effect.ALLOW,
      resources: [  
        this.testBucket.bucketArn,
        this.testBucket.bucketArn + '/*'
        ]
    })

    this.bioimageSearchAccessPolicy.addStatements(cloudFormationPolicyStatement)
    
    this.bioimageSearchAccessPolicy.addStatements(testBucketPolicyStatement)
    
    const bioimageSearchUser = new iam.User(this, "bioimageSearchUser");
    
    this.bioimageSearchAccessPolicy.attachToUser(bioimageSearchUser)
    
    // this.testBucketRole = new iam.Role(this, 'testBucketRole', {
    //   assumedBy: bioimageSearchUser
    // })
    
    // this.testBucket.grantReadWrite(this.testBucketRole)
    
    const testBucketOutput = new cdk.CfnOutput(this, 'testBucket', { value: this.testBucket.bucketName } )

    // VPC will go here
  }
}

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
    
    this.bioimageSearchAccessPolicy.addStatements(cloudFormationPolicyStatement)
    
    const bioimageSearchUser = new iam.User(this, "bioimageSearchUser");
    
    this.bioimageSearchAccessPolicy.attachToUser(bioimageSearchUser)
    

    // VPC will go here
  }
}

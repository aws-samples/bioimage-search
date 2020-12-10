import * as cdk from "@aws-cdk/core";
import ec2 = require("@aws-cdk/aws-ec2");
import iam = require("@aws-cdk/aws-iam");
import s3 = require("@aws-cdk/aws-s3");
import * as fsx from '@aws-cdk/aws-fsx';

export class BaseStack extends cdk.Stack {
  public dataBucket: s3.Bucket;
  public vpc: ec2.Vpc;
  public fsxl: fsx.LustreFileSystem;

  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    
    this.dataBucket = new s3.Bucket(this, 'BioimageSearchDataBucket', {
          blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL
    });
    
    this.vpc = new ec2.Vpc(this, 'BioimageSearchVPC');
    
    const dataBucketS3path = "s3://" + this.dataBucket.bucketName;

    this.fsxl = new fsx.LustreFileSystem(this, 'BioimageSearchFsxl', {
      lustreConfiguration: { 
        importPath: dataBucketS3path,
        exportPath: dataBucketS3path,
        deploymentType: fsx.LustreDeploymentType.SCRATCH_2
      },
      storageCapacityGiB: 1200,
      vpc: this.vpc,
      vpcSubnet: this.vpc.privateSubnets[0]});    

  const dataBucketOutput = new cdk.CfnOutput(this, 'dataBucket', { value: this.dataBucket.bucketName } )

  }
  
}

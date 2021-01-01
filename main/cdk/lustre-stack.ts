import * as cdk from "@aws-cdk/core";
import ec2 = require("@aws-cdk/aws-ec2");
import iam = require("@aws-cdk/aws-iam");
import s3 = require("@aws-cdk/aws-s3");
import * as fsx from '@aws-cdk/aws-fsx';

export interface LustreStackProps extends cdk.StackProps {
    bioimsVpc: ec2.Vpc;
    dataBucket: s3.Bucket;
}

export class LustreStack extends cdk.Stack {
  public fsxl: fsx.LustreFileSystem;

  constructor(scope: cdk.Construct, id: string, props: LustreStackProps) {
    super(scope, id, props);
    
    const dataBucketS3path = "s3://" + props.dataBucket.bucketName;

    this.fsxl = new fsx.LustreFileSystem(this, 'BioimageSearchFsxl', {
      lustreConfiguration: { 
        importPath: dataBucketS3path,
        exportPath: dataBucketS3path,
        deploymentType: fsx.LustreDeploymentType.SCRATCH_2
      },
      storageCapacityGiB: 1200,
      vpc: props.bioimsVpc,
      vpcSubnet: props.bioimsVpc.privateSubnets[0]});    
    }
    
}

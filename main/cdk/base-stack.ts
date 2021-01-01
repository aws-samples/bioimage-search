import * as cdk from "@aws-cdk/core";
import ec2 = require("@aws-cdk/aws-ec2");
import iam = require("@aws-cdk/aws-iam");
import s3 = require("@aws-cdk/aws-s3");

export class BaseStack extends cdk.Stack {
  public dataBucket: s3.Bucket;
  public vpc: ec2.Vpc;

  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    
    // To create new bucket:
    //
    // this.dataBucket = new s3.Bucket(this, 'BioimageSearchDataBucket', {
    //   blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL
    // });

    // To import existing bucket:
    //
    this.dataBucket = s3.Bucket.fromBucketAttributes(this, 'BioimageSearchDataBucket', {
      bucketArn: 'arn:aws:s3:::bioimagesearchbasestack-bioimagesearchdatabucketa-16h77xh6oyxmm'
    }) as s3.Bucket;
    
    this.vpc = new ec2.Vpc(this, 'BioimageSearchVPC');
    
    const dataBucketS3path = "s3://" + this.dataBucket.bucketName;

    const dataBucketOutput = new cdk.CfnOutput(this, 'dataBucket', { value: this.dataBucket.bucketName } )

  }
  
}

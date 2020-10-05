import iam = require("@aws-cdk/aws-iam");
import cdk = require("@aws-cdk/core");
import s3 = require("@aws-cdk/aws-s3");
import crs = require("crypto-random-string")

export interface ResourcePermissionsStackProps extends cdk.StackProps {
  bioimageSearchAccessPolicy: iam.Policy,
  resourcePermissionsPolicy: iam.Policy
}

export class ResourcePermissionsStack extends cdk.Stack {
  constructor(app: cdk.App, id: string, props: ResourcePermissionsStackProps) {
    super(app, id, props);

    this.addBucketResourceReadOnly('bioimagesearchbbbc021stack-bbbc021bucket544c3e64-10ecnwo51127', props.bioimageSearchAccessPolicy);
    this.addBucketResourceReadOnly('bioimagesearchbbbc021stack-bbbc021bucket544c3e64-10ecnwo51127', props.resourcePermissionsPolicy);

    this.addBucketResourceFullPermissions('bioimage-search-output', props.bioimageSearchAccessPolicy);
    this.addBucketResourceFullPermissions('bioimage-search-output', props.resourcePermissionsPolicy);

  }
  
  addBucketResourceReadOnly(bucketname: string, policy: iam.Policy) {
    const rs = crs({length: 10})
    const bucket = s3.Bucket.fromBucketName(this, bucketname+"-"+rs, bucketname);
    
    const policyStatement = new iam.PolicyStatement({
      actions: [
          "s3:ListBucket",
          "s3:GetObject",
      ],
      effect: iam.Effect.ALLOW,
      resources: [ bucket.bucketArn, bucket.bucketArn + '/*' ]
    })

    policy.addStatements(policyStatement);
  }
  
  addBucketResourceFullPermissions(bucketname: string, policy: iam.Policy) {
    const rs = crs({length: 10})
    const bucket = s3.Bucket.fromBucketName(this, bucketname+"-"+rs, bucketname);
    
    const policyStatement = new iam.PolicyStatement({
      actions: [
          "s3:*",
      ],
      effect: iam.Effect.ALLOW,
      resources: [ bucket.bucketArn, bucket.bucketArn + '/*' ]
    })

    policy.addStatements(policyStatement);
  }

}






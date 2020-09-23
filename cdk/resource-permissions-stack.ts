import iam = require("@aws-cdk/aws-iam");
import cdk = require("@aws-cdk/core");
import s3 = require("@aws-cdk/aws-s3");

export interface ResourcePermissionsStackProps extends cdk.StackProps {
  bioimageSearchAccessPolicy: iam.Policy,
  resourcePermissionsPolicy: iam.Policy
}

export class ResourcePermissionsStack extends cdk.Stack {
  constructor(app: cdk.App, id: string, props: ResourcePermissionsStackProps) {
    super(app, id, props);

    const bbbc021Bucket = s3.Bucket.fromBucketName(this, 'Bbbc021Bucket', 'bioimagesearchbbbc021stack-bbbc021bucket544c3e64-1t2bv8cktyrtq');
    
    const bbbc021PolicyStatement = new iam.PolicyStatement({
      actions: [
          "s3:ListBucket",
          "s3:GetObject",
      ],
      effect: iam.Effect.ALLOW,
      resources: [ bbbc021Bucket.bucketArn, bbbc021Bucket.bucketArn + '/*' ]
    })

    props.bioimageSearchAccessPolicy.addStatements(bbbc021PolicyStatement);
    props.resourcePermissionsPolicy.addStatements(bbbc021PolicyStatement);
    
  }
}






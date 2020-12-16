import lambda = require("@aws-cdk/aws-lambda");
import iam = require("@aws-cdk/aws-iam");
import cdk = require("@aws-cdk/core");
import s3 = require("@aws-cdk/aws-s3");

export interface ImageArtifactStackProps extends cdk.StackProps {
  dataBucket: s3.Bucket;
}

export class ImageArtifactStack extends cdk.Stack {
  public defaultArtifactLambda: lambda.Function;
  
  constructor(app: cdk.App, id: string, props: ImageArtifactStackProps) {
    super(app, id);

    this.defaultArtifactLambda = new lambda.Function(
      this,
      "defaultArtifactFunction",
      {
        code: lambda.Code.fromAsset("src/image-artifact/lambda/default-artifact/build"),
        handler: "default-artifact.handler",
        runtime: lambda.Runtime.PYTHON_3_8,
        memorySize: 3008,
        timeout: cdk.Duration.seconds(300),
        environment: {
          DATA_BUCKET: props.dataBucket.bucketName
        }
      }
    );
    
  }
}
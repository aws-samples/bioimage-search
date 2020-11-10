import lambda = require("@aws-cdk/aws-lambda");
import iam = require("@aws-cdk/aws-iam");
import cdk = require("@aws-cdk/core");

export class ImageArtifactStack extends cdk.Stack {
  public defaultArtifactLambda: lambda.Function;
  
  constructor(app: cdk.App, id: string) {
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
      }
    );
    
  }
}
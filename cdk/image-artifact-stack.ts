import lambda = require("@aws-cdk/aws-lambda");
import iam = require("@aws-cdk/aws-iam");
import cdk = require("@aws-cdk/core");

export interface ImageArtifactStackProps extends cdk.StackProps {
  bioimageSearchAccessPolicy: iam.Policy;
}

export class ImageArtifactStack extends cdk.Stack {
  constructor(app: cdk.App, id: string, props: ImageArtifactStackProps) {
    super(app, id, props);

    const defaultArtifactLambda = new lambda.Function(
      this,
      "defaultArtifactFunction",
      {
        code: lambda.Code.fromAsset("src/image-artifact/lambda/default-artifact"),
        handler: "default-artifact.handler",
        runtime: lambda.Runtime.PYTHON_3_8,
        environment: {
          MEDIUM_2D_MAX_DIM: "1000",
          THUMBNAIL_MAX_DIM: "100",
        },
      }
    );

    const defaultArtifactLambdaArn = defaultArtifactLambda.functionArn
    
    const defaultArtifactLambdaPolicyStatement = new iam.PolicyStatement({
      actions: ["lambda:InvokeFunction"],
      effect: iam.Effect.ALLOW,
      resources: [ defaultArtifactLambdaArn ]
    })
    
    props.bioimageSearchAccessPolicy.addStatements(defaultArtifactLambdaPolicyStatement)
    
  }
}
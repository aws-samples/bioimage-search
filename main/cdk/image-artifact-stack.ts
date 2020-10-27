import lambda = require("@aws-cdk/aws-lambda");
import iam = require("@aws-cdk/aws-iam");
import cdk = require("@aws-cdk/core");

export interface ImageArtifactStackProps extends cdk.StackProps {
  bioimageSearchManagedPolicy: iam.ManagedPolicy;
  externalResourcesPolicy: iam.Policy; 
}

export class ImageArtifactStack extends cdk.Stack {
  constructor(app: cdk.App, id: string, props: ImageArtifactStackProps) {
    super(app, id, props);

    const defaultArtifactLambda = new lambda.Function(
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
    
    if (defaultArtifactLambda.role) {
      defaultArtifactLambda.role.attachInlinePolicy(props.externalResourcesPolicy);
    }

    const defaultArtifactLambdaArn = defaultArtifactLambda.functionArn
    
    const defaultArtifactLambdaPolicyStatement = new iam.PolicyStatement({
      actions: ["lambda:InvokeFunction"],
      effect: iam.Effect.ALLOW,
      resources: [ defaultArtifactLambdaArn ]
    })
    
    props.bioimageSearchManagedPolicy.addStatements(defaultArtifactLambdaPolicyStatement)
    
  }
}
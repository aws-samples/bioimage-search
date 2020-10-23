import dynamodb = require("@aws-cdk/aws-dynamodb");
import lambda = require("@aws-cdk/aws-lambda");
import iam = require("@aws-cdk/aws-iam");
import cdk = require("@aws-cdk/core");

export interface EmbeddingConfigurationStackProps extends cdk.StackProps {
  bioimageSearchAccessPolicy: iam.Policy;
  bioimageSearchRole: iam.Role;
}

export class EmbeddingConfigurationStack extends cdk.Stack {
  constructor(app: cdk.App, id: string, props: EmbeddingConfigurationStackProps) {
    super(app, id, props);

    const embeddingConfigurationTable = new dynamodb.Table(this, "embedding-configuration", {
      partitionKey: {
        name: "name1",
        type: dynamodb.AttributeType.STRING,
      },
      tableName: "EmbeddingConfiguration",
    });

    const embeddingConfigurationLambda = new lambda.Function(
      this,
      "embeddingConfigurationFunction",
      {
        code: new lambda.AssetCode("src/embedding-configuration/build"),
        handler: "embedding-configuration.handler",
        runtime: lambda.Runtime.NODEJS_12_X,
        environment: {
          TABLE_NAME: embeddingConfigurationTable.tableName,
          PARTITION_KEY: "name1"
        },
      }
    );

    embeddingConfigurationTable.grantReadWriteData(embeddingConfigurationLambda);

    const embeddingConfigurationLambdaArn = embeddingConfigurationLambda.functionArn
    
    const embeddingConfigurationLambdaPolicyStatement = new iam.PolicyStatement({
      actions: ["lambda:InvokeFunction"],
      effect: iam.Effect.ALLOW,
      resources: [ embeddingConfigurationLambdaArn ]
    })
    
    const pd2 = new iam.PolicyDocument();

    pd2.addStatements(embeddingConfigurationLambdaPolicyStatement)
    
    const embeddingConfigurationLambdaManagedPolicy = new iam.ManagedPolicy(this, 'embeddingConfigurationLambdaManagedPolicy', {
      document: pd2
    })
    
    //props.bioimageSearchAccessPolicy.addStatements(embeddingConfigurationLambdaPolicyStatement)
    
    props.bioimageSearchRole.addManagedPolicy(embeddingConfigurationLambdaManagedPolicy)
    
  }
}
    
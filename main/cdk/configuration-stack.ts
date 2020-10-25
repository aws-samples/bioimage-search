import dynamodb = require("@aws-cdk/aws-dynamodb");
import lambda = require("@aws-cdk/aws-lambda");
import iam = require("@aws-cdk/aws-iam");
import cdk = require("@aws-cdk/core");

export interface ConfigurationStackProps extends cdk.StackProps {
  bioimageSearchManagedPolicy: iam.ManagedPolicy;
}

export class ConfigurationStack extends cdk.Stack {
  constructor(app: cdk.App, id: string, props: ConfigurationStackProps) {
    super(app, id, props);

    const configurationTable = new dynamodb.Table(this, "configuration", {
      partitionKey: {
        name: "key1",
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: "timestamp1",
        type: dynamodb.AttributeType.STRING,
      },
      tableName: "BioimsConfiguration",
    });

    const configurationLambda = new lambda.Function(
      this,
      "configurationFunction",
      {
        code: new lambda.AssetCode("src/configuration/build"),
        handler: "configuration.handler",
        runtime: lambda.Runtime.NODEJS_12_X,
        environment: {
          TABLE_NAME: configurationTable.tableName,
          PARTITION_KEY: "key1",
          SORT_KEY: "timestamp1",
        },
      }
    );

    configurationTable.grantReadWriteData(configurationLambda);

    const configurationLambdaArn = configurationLambda.functionArn
    
    const configurationLambdaPolicyStatement = new iam.PolicyStatement({
      actions: ["lambda:InvokeFunction"],
      effect: iam.Effect.ALLOW,
      resources: [ configurationLambdaArn ]
    })
    
    props.bioimageSearchManagedPolicy.addStatements(configurationLambdaPolicyStatement)
    
  }
}

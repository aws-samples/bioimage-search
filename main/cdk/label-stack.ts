import dynamodb = require("@aws-cdk/aws-dynamodb");
import lambda = require("@aws-cdk/aws-lambda");
import iam = require("@aws-cdk/aws-iam");
import cdk = require("@aws-cdk/core");

export interface LabelStackProps extends cdk.StackProps {
  bioimageSearchManagedPolicy: iam.ManagedPolicy;
}

export class LabelStack extends cdk.Stack {
  constructor(app: cdk.App, id: string, props: LabelStackProps) {
    super(app, id, props);

    const labelTable = new dynamodb.Table(this, "label", {
      partitionKey: {
        name: "category",
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: "label",
        type: dynamodb.AttributeType.STRING,
      },
      tableName: "BioimsLabel",
    });

    const labelLambda = new lambda.Function(
      this,
      "labelFunction",
      {
        code: new lambda.AssetCode("src/label/build"),
        handler: "label.handler",
        runtime: lambda.Runtime.NODEJS_12_X,
        environment: {
          TABLE_NAME: labelTable.tableName,
          PARTITION_KEY: "category",
          SORT_KEY: "label",
        },
      }
    );

    labelTable.grantReadWriteData(labelLambda);

    const labelLambdaArn = labelLambda.functionArn
    
    const labelLambdaPolicyStatement = new iam.PolicyStatement({
      actions: ["lambda:InvokeFunction"],
      effect: iam.Effect.ALLOW,
      resources: [ labelLambdaArn ]
    })
    
    props.bioimageSearchManagedPolicy.addStatements(labelLambdaPolicyStatement)
    
  }
}
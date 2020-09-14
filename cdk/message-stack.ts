import dynamodb = require("@aws-cdk/aws-dynamodb");
import lambda = require("@aws-cdk/aws-lambda");
import iam = require("@aws-cdk/aws-iam");
import cdk = require("@aws-cdk/core");

export interface MessageStackProps extends cdk.StackProps {
  bioimageSearchAccessPolicy: iam.Policy;
}

export class MessageStack extends cdk.Stack {
  constructor(app: cdk.App, id: string, props: MessageStackProps) {
    super(app, id, props);

    const messageTable = new dynamodb.Table(this, "message", {
      partitionKey: {
        name: "messageId",
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: "timestamp1",
        type: dynamodb.AttributeType.STRING,
      },
      tableName: "BioimsMessage",
    });

    const messageLambda = new lambda.Function(
      this,
      "messageFunction",
      {
        code: new lambda.AssetCode("src/message"),
        handler: "message.handler",
        runtime: lambda.Runtime.NODEJS_12_X,
        environment: {
          TABLE_NAME: messageTable.tableName,
          PARTITION_KEY: "messageId",
          SORT_KEY: "timestamp1",
        },
      }
    );

    messageTable.grantReadWriteData(messageLambda);

    const messageLambdaArn = messageLambda.functionArn
    
    const messageLambdaPolicyStatement = new iam.PolicyStatement({
      actions: ["lambda:InvokeFunction"],
      effect: iam.Effect.ALLOW,
      resources: [ messageLambdaArn ]
    })
    
    props.bioimageSearchAccessPolicy.addStatements(messageLambdaPolicyStatement)
    
  }
}
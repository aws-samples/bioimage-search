import dynamodb = require("@aws-cdk/aws-dynamodb");
import lambda = require("@aws-cdk/aws-lambda");
import iam = require("@aws-cdk/aws-iam");
import cdk = require("@aws-cdk/core");

export interface MessageStackProps extends cdk.StackProps {
  bioimageSearchManagedPolicy: iam.ManagedPolicy;
}

export class MessageStack extends cdk.Stack {
  public messageLambda: lambda.Function
  
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

//        code: new lambda.AssetCode("src/message"),

    this.messageLambda = new lambda.Function(
      this,
      "messageFunction",
      {
        code: lambda.Code.fromAsset("src/message/build"),
        handler: "message.handler",
        runtime: lambda.Runtime.NODEJS_12_X,
        environment: {
          TABLE_NAME: messageTable.tableName,
          PARTITION_KEY: "messageId",
          SORT_KEY: "timestamp1",
        },
      }
    );

    messageTable.grantReadWriteData(this.messageLambda);

    const messageLambdaPolicyStatement = new iam.PolicyStatement({
      actions: ["lambda:InvokeFunction"],
      effect: iam.Effect.ALLOW,
      resources: [ this.messageLambda.functionArn ]
    })
    
    props.bioimageSearchManagedPolicy.addStatements(messageLambdaPolicyStatement)
    
  }
}
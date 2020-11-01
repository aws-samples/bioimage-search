import dynamodb = require("@aws-cdk/aws-dynamodb");
import lambda = require("@aws-cdk/aws-lambda");
import iam = require("@aws-cdk/aws-iam");
import cdk = require("@aws-cdk/core");

export interface TrainingConfigurationStackProps extends cdk.StackProps {
  bioimageSearchManagedPolicy: iam.ManagedPolicy;
}

export class TrainingConfigurationStack extends cdk.Stack {
  public trainingConfigurationLambdaArn: string;
  
  constructor(app: cdk.App, id: string, props: TrainingConfigurationStackProps) {
    super(app, id, props);

    const trainingConfigurationTable = new dynamodb.Table(this, "training-configuration", {
      partitionKey: {
        name: "train_id",
        type: dynamodb.AttributeType.STRING,
      },
      tableName: "BioimsTrainingConfiguration",
    });

    const trainingConfigurationLambda = new lambda.Function(
      this,
      "trainingConfigurationFunction",
      {
        code: new lambda.AssetCode("src/training-configuration/build"),
        handler: "training-configuration.handler",
        runtime: lambda.Runtime.NODEJS_12_X,
        environment: {
          TABLE_NAME: trainingConfigurationTable.tableName,
          PARTITION_KEY: "train_id"
        },
      }
    );

    trainingConfigurationTable.grantFullAccess(trainingConfigurationLambda);
    
    this.trainingConfigurationLambdaArn = trainingConfigurationLambda.functionArn
    
    const trainingConfigurationLambdaPolicyStatement = new iam.PolicyStatement({
      actions: ["lambda:InvokeFunction"],
      effect: iam.Effect.ALLOW,
      resources: [ this.trainingConfigurationLambdaArn ]
    })
    
    props.bioimageSearchManagedPolicy.addStatements(trainingConfigurationLambdaPolicyStatement)
 
   }
}
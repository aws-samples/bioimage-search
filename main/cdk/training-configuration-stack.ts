import dynamodb = require("@aws-cdk/aws-dynamodb");
import lambda = require("@aws-cdk/aws-lambda");
import iam = require("@aws-cdk/aws-iam");
import cdk = require("@aws-cdk/core");

export interface TrainingConfigurationStackProps extends cdk.StackProps {
  dynamoTableNames: any;
}

const TABLE_NAME = "BioimsTrainingConfiguration";

export class TrainingConfigurationStack extends cdk.Stack {
  public trainingConfigurationLambdaArn: string;

  constructor(
    app: cdk.App,
    id: string,
    props: TrainingConfigurationStackProps
  ) {
    super(app, id, props);

    var trainingConfigurationTable: dynamodb.ITable | null = null;

    var createTable = true;

    if (props.dynamoTableNames.indexOf(TABLE_NAME) > -1) {
      console.log("Found table " + TABLE_NAME);
      createTable = false;
    }

    if (createTable) {
      console.log("Creating new table " + TABLE_NAME);
      trainingConfigurationTable = new dynamodb.Table(
        this,
        "training-configuration",
        {
          partitionKey: {
            name: "train_id",
            type: dynamodb.AttributeType.STRING,
          },
          tableName: TABLE_NAME,
        }
      );
    } else {
      console.log("Using already existing table " + TABLE_NAME);
      trainingConfigurationTable = dynamodb.Table.fromTableName(
        this,
        TABLE_NAME,
        TABLE_NAME
      );
    }

    const trainingConfigurationLambda = new lambda.Function(
      this,
      "trainingConfigurationFunction",
      {
        code: new lambda.AssetCode("src/training-configuration/build"),
        handler: "training-configuration.handler",
        runtime: lambda.Runtime.NODEJS_12_X,
        environment: {
          TABLE_NAME: trainingConfigurationTable.tableName,
          PARTITION_KEY: "train_id",
        },
      }
    );

    trainingConfigurationTable.grantFullAccess(trainingConfigurationLambda);

    this.trainingConfigurationLambdaArn =
      trainingConfigurationLambda.functionArn;

  }
}

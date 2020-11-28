import dynamodb = require("@aws-cdk/aws-dynamodb");
import {
  AttributeType,
  BillingMode,
  StreamViewType,
  ProjectionType,
  Table,
} from "@aws-cdk/aws-dynamodb";
import lambda = require("@aws-cdk/aws-lambda");
import iam = require("@aws-cdk/aws-iam");
import cdk = require("@aws-cdk/core");

export interface TrainingConfigurationStackProps extends cdk.StackProps {
  dynamoTableNames: any;
}

const TABLE_NAME = "BioimsTrainingConfiguration";

export class TrainingConfigurationStack extends cdk.Stack {
  public trainingConfigurationLambda: lambda.Function;

  constructor(
    app: cdk.App,
    id: string,
    props: TrainingConfigurationStackProps
  ) {
    super(app, id, props);

    var trainingConfigurationTable: dynamodb.Table | null = null;
    
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
            name: "embedding_name",
            type: dynamodb.AttributeType.STRING,
          },
          sortKey: {
            name: "train_id",
            type: dynamodb.AttributeType.STRING,
          },
          tableName: TABLE_NAME,
        }
      );
      
      trainingConfigurationTable.addGlobalSecondaryIndex({
        indexName: "trainIdIndex",
        partitionKey: {
          name: "trainId",
          type: dynamodb.AttributeType.STRING,
        },
        sortKey: {
          name: "embeddingName",
          type: dynamodb.AttributeType.STRING,
        },
        projectionType: ProjectionType.KEYS_ONLY,
      });
      
    } else {
      console.log("Using already existing table " + TABLE_NAME);
      trainingConfigurationTable = dynamodb.Table.fromTableName(
        this,
        TABLE_NAME,
        TABLE_NAME
      ) as Table;
    }

    this.trainingConfigurationLambda = new lambda.Function(
      this,
      "trainingConfigurationFunction",
      {
        code: new lambda.AssetCode("src/training-configuration/build"),
        handler: "training-configuration.handler",
        runtime: lambda.Runtime.NODEJS_12_X,
        environment: {
          TABLE_NAME: trainingConfigurationTable.tableName,
          PARTITION_KEY: "embedding_name",
          SORT_KEY: "train_id",
          TRAIN_INDEX: "trainIdIndex",
        },
      }
    );
    
    const trainTableAccessPolicy = new iam.PolicyStatement({
      actions: ["dynamodb:*"],
      effect: iam.Effect.ALLOW,
      resources: [
        trainingConfigurationTable.tableArn,
        trainingConfigurationTable.tableArn + "/index/*"
      ]
    });
    
    const lambdaPolicy = new iam.Policy(this, "traningConfigurationAccessPolicy");
    lambdaPolicy.addStatements(trainTableAccessPolicy);
    this.trainingConfigurationLambda.role!.attachInlinePolicy(lambdaPolicy);

  }
}

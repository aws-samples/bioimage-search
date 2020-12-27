import dynamodb = require("@aws-cdk/aws-dynamodb");
import lambda = require("@aws-cdk/aws-lambda");
import iam = require("@aws-cdk/aws-iam");
import cdk = require("@aws-cdk/core");

export interface ConfigurationStackProps extends cdk.StackProps {
  dynamoTableNames: any;
}

const TABLE_NAME = "BioimsConfiguration"

export class ConfigurationStack extends cdk.Stack {
  public configurationLambdaArn: string;
  
  constructor(app: cdk.App, id: string, props: ConfigurationStackProps) {
    super(app, id, props);

    var configurationTable: dynamodb.ITable | null = null;

    var createTable = true;
    
    if (props.dynamoTableNames.indexOf(TABLE_NAME) > -1) {
      console.log("Found table "+TABLE_NAME)
      createTable = false;
    }

    if (createTable) {
      console.log("Creating new table "+TABLE_NAME)
      configurationTable = new dynamodb.Table(this, "configuration", {
        partitionKey: {
          name: "key1",
          type: dynamodb.AttributeType.STRING,
        },
        sortKey: {
          name: "timestamp1",
          type: dynamodb.AttributeType.STRING,
        },
        tableName: TABLE_NAME,
        billingMode: dynamodb.BillingMode.PAY_PER_REQUEST
      });
    } else {
      console.log("Using already existing table "+TABLE_NAME)
      configurationTable = dynamodb.Table.fromTableName(
        this,
        TABLE_NAME,
        TABLE_NAME
      );
    }

    const configurationLambda = new lambda.Function(
      this,
      "configurationFunction",
      {
        code: new lambda.AssetCode("src/configuration/build"),
        handler: "configuration.handler",
        runtime: lambda.Runtime.NODEJS_12_X,
        memorySize: 256,
        timeout: cdk.Duration.minutes(1),
        environment: {
          TABLE_NAME: configurationTable.tableName,
          PARTITION_KEY: "key1",
          SORT_KEY: "timestamp1",
        },
      }
    );

    configurationTable.grantReadWriteData(configurationLambda);
    this.configurationLambdaArn = configurationLambda.functionArn;
  }
  
}

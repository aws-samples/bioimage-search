import * as cdk from "@aws-cdk/core";
import * as Dynamodb from 'aws-sdk/clients/dynamodb';
import { SharedIniFileCredentials } from 'aws-sdk';

export class BioimageStack extends cdk.Stack {
    public dynamoTablesValue: string;
    
    async checkIfDynamoDbExists(name: string ) {
        const credentials = new SharedIniFileCredentials({profile: 'default'});
        const dynamodb = new Dynamodb({
            region: process.env.CDK_DEFAULT_REGION,
            credentials: credentials
        });
        const tables = await dynamodb.listTables().promise();
        return tables!.TableNames!.indexOf(name) > 0;
    }
    
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
  }
  
}

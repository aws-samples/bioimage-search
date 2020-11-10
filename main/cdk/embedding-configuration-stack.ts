import dynamodb = require("@aws-cdk/aws-dynamodb");	
import lambda = require("@aws-cdk/aws-lambda");		
import iam = require("@aws-cdk/aws-iam");		
import cdk = require("@aws-cdk/core");			

export interface EmbeddingConfigurationStackProps extends cdk.StackProps {	
  dynamoTableNames: any;       
} 

const TABLE_NAME = "BioimsEmbeddingConfiguration"	

export class EmbeddingConfigurationStack extends cdk.Stack {	
  public embeddingConfigurationLambdaArn: string;
  
  constructor(app: cdk.App, id: string, props: EmbeddingConfigurationStackProps) {	
    super(app, id, props);  

    var embeddingConfigurationTable: dynamodb.ITable | null = null;	

    var createTable = true;	     

    if (props.dynamoTableNames.indexOf(TABLE_NAME) > -1) {	
      createTable = false;			   
    } 

    if (createTable) {	
      console.log("Creating new table "+TABLE_NAME)	
      embeddingConfigurationTable = new dynamodb.Table(this, "embedding-configuration", {	
      partitionKey: {		  
        name: "name1",		  
        type: dynamodb.AttributeType.STRING,	
      },      
      tableName: "BioimsEmbeddingConfiguration",	
    });		 
    } else {	 
      console.log("Using already existing table "+TABLE_NAME)	
      embeddingConfigurationTable = dynamodb.Table.fromTableName(this, TABLE_NAME, TABLE_NAME);	
    } 

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
    
    this.embeddingConfigurationLambdaArn = embeddingConfigurationLambda.functionArn;
  } 
  
}
import dynamodb = require("@aws-cdk/aws-dynamodb");
import { AttributeType, BillingMode, StreamViewType, ProjectionType, Table } from '@aws-cdk/aws-dynamodb';
import lambda = require("@aws-cdk/aws-lambda");
import iam = require("@aws-cdk/aws-iam");
import cdk = require("@aws-cdk/core");
import * as sfn from '@aws-cdk/aws-stepfunctions';
import * as tasks from '@aws-cdk/aws-stepfunctions-tasks';

export interface ProcessPlateStackProps extends cdk.StackProps {
  bioimageSearchManagedPolicy: iam.ManagedPolicy;
  messageLambda: lambda.Function;
  imageManagementLambda: lambda.Function;
  externalResourcesPolicy: iam.Policy;
}

export class ProcessPlateStack extends cdk.Stack {
  constructor(app: cdk.App, id: string, props: ProcessPlateStackProps) {
    super(app, id, props);

    const imageInspectorLambda = new lambda.Function(
      this,
      "imageInspectorFunction",
      {
        code: lambda.Code.fromAsset("src/image-inspector/build"),
        handler: "image-inspector.handler",
        runtime: lambda.Runtime.PYTHON_3_8,
        memorySize: 3008,
        timeout: cdk.Duration.minutes(15),
        environment: {
          MESSAGE_LAMBDA_ARN: props.messageLambda.functionArn,
          IMAGE_MANAGEMENT_LAMBDA_ARN: props.imageManagementLambda.functionArn
        },
      }
    );
    
    ///////////////////////////////////////////
    //
    // PlateProcessing StepFunction
    //
    ///////////////////////////////////////////
    
    const plateToImages = new tasks.LambdaInvoke(this, 'Plate To Images', {
      lambdaFunction: props.imageManagementLambda,
      outputPath: '$.images',
    });
    
    const imageInspector = new tasks.LambdaInvoke(this, 'Image Inspector', {
      lambdaFunction: imageInspectorLambda,
    })

    const inspectorMap = new sfn.Map(this, 'Inspector Map', {
      maxConcurrency: 0,
      itemsPath: sfn.JsonPath.stringAt('$.images.body'),
      outputPath: '$.inspection'
    });
    inspectorMap.iterator(imageInspector);
    
    const processPlateStepFunctionDef = plateToImages.next(inspectorMap)

    const processPlateStateMachine = new sfn.StateMachine(this, 'Process Plate StateMachine', {
      definition: processPlateStepFunctionDef,
      timeout: cdk.Duration.minutes(3)
    });
    
    imageInspectorLambda.addEnvironment("PROCESS_PLATE_SFN", processPlateStateMachine.stateMachineArn);
    
    const processPlateLambda = new lambda.Function(
      this,
      "processPlateFunction",
      {
        code: lambda.Code.fromAsset("src/process-plate/build"),
        handler: "process-plate.handler",
        runtime: lambda.Runtime.NODEJS_12_X,
        memorySize: 512,
        timeout: cdk.Duration.minutes(3),
        environment: {
          MESSAGE_LAMBDA_ARN: props.messageLambda.functionArn,
          IMAGE_MANAGEMENT_LAMBDA_ARN: props.imageManagementLambda.functionArn,
//          PROCESS_PLATE_SFN_ARN: processPlateStateMachine.stateMachineArn
        },
      }
    );

    const invokeLambdaPolicyStatement = new iam.PolicyStatement({
      actions: ["lambda:InvokeFunction"],
      effect: iam.Effect.ALLOW,
      resources: [ props.imageManagementLambda.functionArn, props.messageLambda.functionArn ]
    })

    if (imageInspectorLambda.role) {
      imageInspectorLambda.role.attachInlinePolicy(props.externalResourcesPolicy);
      imageInspectorLambda.role.addToPolicy(invokeLambdaPolicyStatement);
    }

    if (processPlateLambda.role) {
      processPlateLambda.role.attachInlinePolicy(props.externalResourcesPolicy);
      processPlateLambda.role.addToPolicy(invokeLambdaPolicyStatement);
    }

    const lambdaPolicyStatement = new iam.PolicyStatement({
      actions: ["lambda:InvokeFunction"],
      effect: iam.Effect.ALLOW,
      resources: [ 
        imageInspectorLambda.functionArn, 
        processPlateLambda.functionArn 
        ]
    })
    
    props.bioimageSearchManagedPolicy.addStatements(lambdaPolicyStatement)

  }

}

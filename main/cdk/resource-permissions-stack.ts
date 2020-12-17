import iam = require("@aws-cdk/aws-iam");
import cdk = require("@aws-cdk/core");
import s3 = require("@aws-cdk/aws-s3");
import lambda = require("@aws-cdk/aws-lambda");
import * as sfn from '@aws-cdk/aws-stepfunctions';
import crs = require("crypto-random-string");

export interface ResourcePermissionsStackProps extends cdk.StackProps {
  dataBucket: s3.Bucket;
  batchInstanceRole: iam.Role;
  configurationLambdaArn: string;
  labelLambdaArn: string;
  messageLambda: lambda.Function;
  defaultArtifactLambda: lambda.Function;
  trainingConfigurationLambda: lambda.Function;
  artifactLambda: lambda.Function;
  imageManagementLambda: lambda.Function;
  imageInspectorLambda: lambda.Function;
  processPlateLambda: lambda.Function;
  processPlateStateMachine: sfn.StateMachine;
  uploadSourcePlateStateMachine: sfn.StateMachine;
  trainLambda: lambda.Function;
  trainStateMachine: sfn.StateMachine;
}

export class ResourcePermissionsStack extends cdk.Stack {
  public bioimageSearchManagedPolicy: iam.ManagedPolicy;
  public externalResourcesPolicy: iam.Policy;
  public bioimageSearchUser: iam.User;
  public bioimageSearchRole: iam.Role;

  addBucketResourceReadOnly(bucketname: string, policy: any) {
    const rs = crs({ length: 10 });
    const bucket = s3.Bucket.fromBucketName(
      this,
      bucketname + "-" + rs,
      bucketname
    );

    const policyStatement = new iam.PolicyStatement({
      actions: ["s3:ListBucket", "s3:GetObject"],
      effect: iam.Effect.ALLOW,
      resources: [bucket.bucketArn, bucket.bucketArn + "/*"],
    });

    policy.addStatements(policyStatement);
  }

  addBucketResourceFullPermissions(bucketname: string, policy: any) {
    const rs = crs({ length: 10 });
    const bucket = s3.Bucket.fromBucketName(
      this,
      bucketname + "-" + rs,
      bucketname
    );

    const policyStatement = new iam.PolicyStatement({
      actions: ["s3:*"],
      effect: iam.Effect.ALLOW,
      resources: [bucket.bucketArn, bucket.bucketArn + "/*"],
    });

    policy.addStatements(policyStatement);
  }

  constructor(app: cdk.App, id: string, props: ResourcePermissionsStackProps) {
    super(app, id, props);
    
    this.bioimageSearchUser = new iam.User(this, "bioimageSearchUser");

    this.bioimageSearchRole = new iam.Role(this, "bioimageSearchRole", {
      assumedBy: this.bioimageSearchUser,
    });


    this.bioimageSearchManagedPolicy = new iam.ManagedPolicy(this, "biomageSearchManagedPolicy");

    this.externalResourcesPolicy = new iam.Policy(this, "externalResourcesPolicy");

    const cloudFormationPolicyStatement = new iam.PolicyStatement({
      actions: [
        "cloudformation:Describe*",
        "cloudformation:List*",
        "cloudformation:Get*",
      ],
      effect: iam.Effect.ALLOW,
      resources: ["*"],
    });

    const dataBucketPolicyStatement = new iam.PolicyStatement({
      actions: ["s3:*"],
      effect: iam.Effect.ALLOW,
      resources: [
        props.dataBucket.bucketArn,
        props.dataBucket.bucketArn + "/*",
      ],
    });

    this.bioimageSearchManagedPolicy.addStatements(cloudFormationPolicyStatement);
    this.bioimageSearchManagedPolicy.addStatements(dataBucketPolicyStatement);
    this.bioimageSearchManagedPolicy.attachToUser(this.bioimageSearchUser);
    
    // EXTERNAL RESOURCES

    this.addBucketResourceReadOnly("bioimagesearchbbbc021stack-bbbc021bucket544c3e64-10ecnwo51127", this.bioimageSearchManagedPolicy);
    this.addBucketResourceReadOnly("bioimagesearchbbbc021stack-bbbc021bucket544c3e64-10ecnwo51127", this.externalResourcesPolicy);

    this.addBucketResourceFullPermissions("bioimage-search-input", this.bioimageSearchManagedPolicy);
    this.addBucketResourceFullPermissions("bioimage-search-input", this.externalResourcesPolicy);

    this.addBucketResourceFullPermissions("bioimage-search-output", this.bioimageSearchManagedPolicy);
    this.addBucketResourceFullPermissions("bioimage-search-output", this.externalResourcesPolicy);
    
    // BATCH
    
//            assumedBy: new iam.ServicePrincipal('batch.amazonaws.com'),
//        managedPolicies: [iam.ManagedPolicy.fromAwsManagedPolicyName("service-role/AWSBatchServiceRole")],

    
//    this.bioimageSearchManagedPolicy.attachToRole(props.batchInstanceRole)


    // LAMBDA
    
    const invokeLambdaPolicyStatement = new iam.PolicyStatement({
      actions: ["lambda:InvokeFunction"],
      effect: iam.Effect.ALLOW,
      resources: [props.configurationLambdaArn,
                  props.labelLambdaArn,
                  props.messageLambda.functionArn,
                  props.defaultArtifactLambda.functionArn,
                  props.trainingConfigurationLambda.functionArn,
                  props.artifactLambda.functionArn,
                  props.imageManagementLambda.functionArn,
                  props.imageInspectorLambda.functionArn,
                  props.processPlateLambda.functionArn,
                  props.trainLambda.functionArn
                ]
    });
    
    const invokeStepFunctionsPolicyStatement = new iam.PolicyStatement({
      actions: ["states:StartExecution"],
      effect: iam.Effect.ALLOW,
      resources: [props.processPlateStateMachine.stateMachineArn,
                  props.uploadSourcePlateStateMachine.stateMachineArn,
                  props.trainStateMachine.stateMachineArn
      ]
    });

    this.bioimageSearchManagedPolicy.addStatements(
      invokeLambdaPolicyStatement,
      invokeStepFunctionsPolicyStatement
    );

    props.defaultArtifactLambda!.role!.attachInlinePolicy(this.externalResourcesPolicy);
    props.imageManagementLambda!.role!.attachInlinePolicy(this.externalResourcesPolicy);
    props.imageInspectorLambda!.role!.attachInlinePolicy(this.externalResourcesPolicy);
    props.processPlateLambda!.role!.attachInlinePolicy(this.externalResourcesPolicy);
    props.trainLambda!.role!.attachInlinePolicy(this.externalResourcesPolicy);
    
    // const artifactPolicyStatement = new iam.PolicyStatement({
    //   actions: ["s3:*"],
    //   effect: iam.Effect.ALLOW,
    //   resources: ["*"],
    // });
    
    const artifactPolicy = new iam.Policy(this, "artifactPolicy");
    artifactPolicy.addStatements(dataBucketPolicyStatement);
    artifactPolicy.addStatements(cloudFormationPolicyStatement);
    props.artifactLambda!.role!.attachInlinePolicy(artifactPolicy);

    const defaultArtifactPolicyStatement = new iam.PolicyStatement({
      actions: ["lambda:InvokeFunction"],
      effect: iam.Effect.ALLOW,
      resources: [props.imageManagementLambda.functionArn,
                  props.configurationLambdaArn]
    });
    const defaultArtifactPolicy = new iam.Policy(this, "defaultArtifactPolicy");
    defaultArtifactPolicy.addStatements(defaultArtifactPolicyStatement);
    defaultArtifactPolicy.addStatements(cloudFormationPolicyStatement);
    defaultArtifactPolicy.addStatements(dataBucketPolicyStatement);
    props.defaultArtifactLambda!.role!.attachInlinePolicy(defaultArtifactPolicy);

    const imageInspectorPolicyStatement = new iam.PolicyStatement({
      actions: ["lambda:InvokeFunction"],
      effect: iam.Effect.ALLOW,
      resources: [props.imageManagementLambda.functionArn]
    });
    const imageInspectorPolicy = new iam.Policy(this, "imageInspectorPolicy");
    imageInspectorPolicy.addStatements(imageInspectorPolicyStatement);
    props.imageInspectorLambda!.role!.attachInlinePolicy(imageInspectorPolicy);
    
    const imageManagementPolicyStatement = new iam.PolicyStatement({
      actions: ["lambda:InvokeFunction"],
      effect: iam.Effect.ALLOW,
      resources: [props.messageLambda.functionArn,
                  props.artifactLambda.functionArn
                ]
    });
    const imageManagementPolicy = new iam.Policy(this, "imageManagementPolicy");
    imageManagementPolicy.addStatements(imageManagementPolicyStatement);
    props.imageManagementLambda!.role!.attachInlinePolicy(imageManagementPolicy);
    
    const processPlatePolicyStatement = new iam.PolicyStatement({
      actions: ["lambda:InvokeFunction"],
      effect: iam.Effect.ALLOW,
      resources: [props.messageLambda.functionArn,
                  props.imageManagementLambda.functionArn
                ]
    })
    const processPlatePolicy = new iam.Policy(this, "processPlatePolicy");
    processPlatePolicy.addStatements(invokeStepFunctionsPolicyStatement);
    processPlatePolicy.addStatements(processPlatePolicyStatement);
    props.processPlateLambda!.role!.attachInlinePolicy(processPlatePolicy);
    
    const trainPolicyStatement = new iam.PolicyStatement({
      actions: ["lambda:InvokeFunction"],
      effect: iam.Effect.ALLOW,
      resources: [props.messageLambda.functionArn,
                  props.imageManagementLambda.functionArn,
                  props.trainingConfigurationLambda.functionArn
                ]
    })
    const trainPolicy = new iam.Policy(this, "trainPolicy");
    trainPolicy.addStatements(invokeStepFunctionsPolicyStatement);
    trainPolicy.addStatements(trainPolicyStatement);
    props.trainLambda!.role!.attachInlinePolicy(trainPolicy);
    
    //////////////////////////////////////////////////////////////////////////////
    // Batch
    //////////////////////////////////////////////////////////////////////////////

    const batchInstancePolicy = new iam.Policy(this, "BatchInstancePolicy");
    batchInstancePolicy.addStatements(cloudFormationPolicyStatement);
    batchInstancePolicy.addStatements(dataBucketPolicyStatement);
    batchInstancePolicy.addStatements(invokeLambdaPolicyStatement);
    this.addBucketResourceReadOnly("bioimagesearchbbbc021stack-bbbc021bucket544c3e64-10ecnwo51127", batchInstancePolicy);


    props.batchInstanceRole.attachInlinePolicy(batchInstancePolicy);


  }
  
}

import iam = require("@aws-cdk/aws-iam");
import cdk = require("@aws-cdk/core");
import ec2 = require("@aws-cdk/aws-ec2");
import batch = require("@aws-cdk/aws-batch");

import crs = require("crypto-random-string");

export class BatchSetupStack extends cdk.Stack {
  public batchInstanceRole: iam.Role;
  public batchVpc: ec2.Vpc;
  public batchSpotQueue: batch.JobQueue;
  public batchOnDemandQueue: batch.JobQueue;
  public spotQueueOutput: cdk.CfnOutput
  public onDemandQueueOutput: cdk.CfnOutput

  constructor(app: cdk.App, id: string) {
    super(app, id);

    this.batchInstanceRole = new iam.Role(this, 'batchInstanceRole', {
        assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
        managedPolicies: [iam.ManagedPolicy.fromAwsManagedPolicyName("service-role/AmazonEC2ContainerServiceforEC2Role")],
    });
    
    this.batchVpc = new ec2.Vpc(this, 'Batch-VPC');
    
    const batchInstanceProfile = new iam.CfnInstanceProfile(this, "Batch-Instance-Profile", {
      instanceProfileName: "batchInstanceProfile",
      roles: [
          this.batchInstanceRole.roleName
      ]
    });
    
    const managedSpotBatchEnvironment = new batch.ComputeEnvironment(this, 'Managed-Spot-Batch-ComputeEnv', {
      computeResources: {
        type: batch.ComputeResourceType.SPOT,
        vpc: this.batchVpc,
        instanceRole: batchInstanceProfile.attrArn
      }
    });

    const managedOnDemandBatchEnvironment = new batch.ComputeEnvironment(this, 'Managed-OnDemand-Batch-ComputeEnv', {
      computeResources: {
        type: batch.ComputeResourceType.ON_DEMAND,
        vpc: this.batchVpc,
        instanceRole: batchInstanceProfile.attrArn
      }
    });
    
    this.batchSpotQueue = new batch.JobQueue(this, 'Batch-Spot-Queue', {
      computeEnvironments: [
          {
            computeEnvironment: managedSpotBatchEnvironment,
            order: 2
          },
          {
            computeEnvironment: managedOnDemandBatchEnvironment,
            order: 1
          }
        ]
    });
    
    this.batchOnDemandQueue = new batch.JobQueue(this, 'Batch-OnDemand-Queue', {
      computeEnvironments: [
          {
            computeEnvironment: managedOnDemandBatchEnvironment,
            order: 2
          },
          {
            computeEnvironment: managedSpotBatchEnvironment,
            order: 1
          }
        ]
    });
    
    this.spotQueueOutput = new cdk.CfnOutput(this, 'batchSpotQueueName', { value: this.batchSpotQueue.jobQueueName } )
    this.onDemandQueueOutput = new cdk.CfnOutput(this, 'batchOnDemandQueueName', { value: this.batchOnDemandQueue.jobQueueName } )

  }
  
}

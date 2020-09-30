import iam = require("@aws-cdk/aws-iam");
import cdk = require("@aws-cdk/core");
import ec2 = require("@aws-cdk/aws-ec2");
import batch = require("@aws-cdk/aws-batch");

import crs = require("crypto-random-string");

export interface BatchSetupStackProps extends cdk.StackProps {
  bioimageSearchAccessPolicy: iam.Policy
}

export class BatchSetupStack extends cdk.Stack {
  public batchInstanceRole: iam.Role;
  public batchVpc: ec2.Vpc;
  public batchSpotQueue: batch.JobQueue;
  public batchOnDemandQueue: batch.JobQueue;
  
  constructor(app: cdk.App, id: string, props: BatchSetupStackProps) {
    super(app, id, props);
    
    this.batchInstanceRole = new iam.Role(this, 'batchInstanceRole', {
        assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
        managedPolicies: [iam.ManagedPolicy.fromAwsManagedPolicyName("service-role/AmazonEC2ContainerServiceforEC2Role")],
    });
    
    props.bioimageSearchAccessPolicy.attachToRole(this.batchInstanceRole)
    
    this.batchVpc = new ec2.Vpc(this, 'Batch-VPC');
    
    const managedSpotBatchEnvironment = new batch.ComputeEnvironment(this, 'Managed-Spot-Batch-ComputeEnv', {
      computeResources: {
        type: batch.ComputeResourceType.SPOT,
        vpc: this.batchVpc,
        instanceRole: this.batchInstanceRole.roleName
      }
    });
    
    const managedOnDemandBatchEnvironment = new batch.ComputeEnvironment(this, 'Managed-OnDemand-Batch-ComputeEnv', {
      computeResources: {
        type: batch.ComputeResourceType.ON_DEMAND,
        vpc: this.batchVpc,
        instanceRole: this.batchInstanceRole.roleName
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
            computeEnvironment: managedSpotBatchEnvironment,
            order: 1
          },
          {
            computeEnvironment: managedOnDemandBatchEnvironment,
            order: 2
          }
        ]
    });

  }
  
}

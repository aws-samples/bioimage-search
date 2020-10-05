import iam = require("@aws-cdk/aws-iam");
import cdk = require("@aws-cdk/core");
import ec2 = require("@aws-cdk/aws-ec2");
import batch = require("@aws-cdk/aws-batch");
import ecs = require("@aws-cdk/aws-ecs")

import crs = require("crypto-random-string");

export interface PlatePreprocessingStackProps extends cdk.StackProps {
  bioimageSearchAccessPolicy: iam.Policy
}

export class PlatePreprocessingStack extends cdk.Stack {
  public platePreprocessingJobDefinition: batch.JobDefinition;
  
  constructor(app: cdk.App, id: string, props: PlatePreprocessingStackProps) {
    super(app, id, props);
    
    this.platePreprocessingJobDefinition = new batch.JobDefinition(this, 'plate-preprocessing-job-def', {
        container: {
            image: ecs.ContainerImage.fromAsset('src/plate-preprocessing'),
            vcpus: 1,
            memoryLimitMiB: 7500,
            readOnly: false,
            privileged: true
        },
        retryAttempts: 3,
        timeout: cdk.Duration.minutes(30)
    })

  }
    
}
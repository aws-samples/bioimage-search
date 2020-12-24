import iam = require("@aws-cdk/aws-iam");
import cdk = require("@aws-cdk/core");
import ec2 = require("@aws-cdk/aws-ec2");
import batch = require("@aws-cdk/aws-batch");
import ecs = require("@aws-cdk/aws-ecs")
import crs = require("crypto-random-string");

export class ImagePreprocessingStack extends cdk.Stack {
  public imagePreprocessingJobDefinition: batch.JobDefinition;
  
  constructor(app: cdk.App, id: string) {
    super(app, id);
    
    this.imagePreprocessingJobDefinition = new batch.JobDefinition(this, 'image-preprocessing-job-def', {
        container: {
            image: ecs.ContainerImage.fromAsset('src/image-preprocessing'),
            vcpus: 1,
            memoryLimitMiB: 7500,
            readOnly: false,
            privileged: true,
            command: [
              "Ref::regionArg",
              "Ref::region",
              "Ref::bucketArg",
              "Ref::bucket",
              "Ref::imageIdArg",
              "Ref::imageId",
              "Ref::embeddingNameArg",
              "Ref::embeddingName"
              ],
        },
        retryAttempts: 1,
        timeout: cdk.Duration.minutes(180)
    })

  }
}
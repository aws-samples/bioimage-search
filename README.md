## Bioimage Search

NOTE: this project is in pre-release.

### Project Summary

This is a "Proof of Concept" project that provides an example architecture of:

* A serverless ML-Ops environment for creating and managing embeddings on arbitrary image sets, but with specific features for deep phenotyping of high-throughput cell cultures
* A search service for finding nearest neighbors
* A design that can be efficiently scaled
* An implementation with the AWS CDK

## Security

See [CONTRIBUTING](CONTRIBUTING.md#security-issue-notifications) for more information.

## License

This project is licensed under the Apache-2.0 License.

Once deployed, this system can be used in a variety of ways concurrently:

* By a user on the command line using the bioims cli
* By calling the Lambda function methods for the various microservices
* By writing new AWS functions that interact with the project components

## BBBC-021 Embedding Training + Search Walkthrough

The architecture of this project is designed to scale horizontally (with the exception of the example search service, which scales vertically). An implication is that the "wall clock" time required to do the walkthrough depends on account limits.
The minimum time (with high service limits) is 6 hours, the maximum time (with low service limits) could be 24+ hours.

### Create account and create role with Admin privileges.

Generally, we are aiming to have Cloud9 manage the deployment of the stacks and services, and SageMaker Studio run the ML notebooks.

* Setup (Cloud9)
* Baseline (Studio)
* MOA evaluation (Studio)

### Cloud9 Setup

Using Cloud9 is optional, but convenient for working with or looking at the code for this project. Set up a Cloud9 instance.

NOTES:

* Because this project involves long-running shell processes, it is recommended to, when creating the Cloud9 environment, use an “always on” or long timeout setting.

During setup, there is not an option to increase the disk size. This instance type should be a minimum of “t3.medium”, but it might be necessary to increase memory and therefore switch to a different instance type such as “t3.large”. This can be done at any time using these directions:
https://docs.aws.amazon.com/cloud9/latest/user-guide/move-environment.html

Follow these directions to resize the environment EBS volume to 60GB:
https://docs.aws.amazon.com/cloud9/latest/user-guide/move-environment.html#move-environment-resize

Next, configure SSH access to GitHub using these directions:
https://docs.github.com/en/github/authenticating-to-github/connecting-to-github-with-ssh

Clone the bioimage-search repo using SSH.

### SageMaker Studio Setup

Pick username, e.g., “bioims-user” (or use default).

Create new IAM role, if needed.

Wait for new SageMaker Studio instance (10+ minutes the first time).

Open Studio (another 10+ minutes the first time).

Launch “System Terminal”.

Follow the same directions as above to setup GitHub SSH access.

Also, set git identity:

```
git config --global user.email "you@example.com“
git config --global user.name "Your Name"
```

Next, clone the bioimage-search repo using SSH.

### Setup Bioimage Search Development Environment

Create a Cloud9 shell tab.

```
cd bioimage-search

bash install.sh

cd main/scripts

bash ./source-python.sh

cd ../../..

sudo pip3 install boto3

source ./bioimage-search/main/scripts/source-env.sh

cd bioimage-search/main

rm package-lock.json

npm install
```

NOTE: after initial setup, every time the Cloud9 environment is re-initialized, only this command should be run manually:

```
source bioimage-search/main/scripts/source-env.sh
```

### Download BBBC-021 Dataset Using CDK

Go to Cloud9 shell tab.

```
cd bioimage-search/datasets/bbbc-021

rm package-lock.json

npm install

./deploy.sh
```

This will start a CodeBuild job, the logs for which can be observed in the CodeBuild service.

The job will typically take 25 minutes to run.

The result will be a copy of the bbbc-021 dataset in an S3 bucket named something like ‘bioimagesearchbbbc021stack-bbbc021bucket544c3e64-ugln15rb234b’.

### Create and Configure S3 Buckets

The system requires that three buckets be created in advance and added to the following parameters in this file:

```
bioimage-search/main/bin/aws.ts
```

Params to modify:

RESOURCE_BUCKET 
DATA_BUCKET
BBBC021_BUCKET

The RESOURCE_S3_BUCKET is an input landing zone for users to add resources for the system to use.

The DATA_S3_BUCKET is entirely managed by the system (we also refer to it as the 'artifact' bucket).

Also, the BBBC021_BUCKET should be configured, using the name auto-generated from the stack above.

### Deploy Bioimage Search

This step will deploy the project on aws using the cdk.

```
cd bioimage-search/main

./deploy.sh
```

This will take approximately 70 minutes to complete. There may be points at which (y/n) is required before modifying IAM permissions.

### Configure Bioims CLI

NOTE: we assume that python is python3

```
cd bioimage-search/cli/bioims
python -m venv venv
source venv/bin/activate
python -m pip install -r requirements.txt
```

### Initialize Configuration

The Configuration table is used to store parameters for the project.

```
cd bioimage-search/cli/bioims/test
python populate-configuration.py
```

### Configure BBBC-021 Datasets Env

```
cd bioimage-search/datasets/bbbc-021/scripts
deactivate
python -m venv venv
source venv/bin/activate
python -m pip install -r requirements.txt
```

### Create BBBC-021 Plate Manifests

This step will take about one hour using -P 4.

```
cd bioimage-search/datasets/bbbc-021/scripts
cat plate_list.txt | xargs -n 1 -P 4 ./upload_source_plate.sh
```

NOTE: if something goes wrong during this step, these two tables will need to be deleted from DynamoDB (using the console is fine) and re-created with the corresponding cdk steps in "deploy.sh", before re-running the entire process.
Rerunning the entire "deploy.sh" is fine, but will take longer than running the specific substeps for the "BioimsImageManagementStack" and "BioimsArtifactStack".

* BioimsImageManagement
* BioimsArtifact

### Create Embedding

Go to Batch service in the AWS console.
Click “Job definitions” in the left pane.
Copy the ARNs for both the “imagepreproecssingjob*” and “platepreprocessingjob*” to this script. Also, fill in the other parameters as needed for the deployment.

```
bioimage-search/cli/bioims/test/populate-training-configuration.py
```

Then, use this script to create the embedding:

```
cd bioimage-search/cli/bioims/test
python ./populate-training-configuration.py
```

### Copy training script to Resource Bucket

```
cd bioimage-search/datasets/bbbc-021/scripts
aws s3 cp bbbc021-1-train-script.py s3://<name of resource bucket>
```

### Populate Label Table

```
cd bioimage-search/cli/bioims/test
python populate-label.py
```

### Compute image processing steps and train ‘baseline’ model

Fill-in appropriate vars in this script and run:

```
cd bioimage-search/cli/bioims/test
python test-train.py
```

Three parts:

* Image processing - takes about 10 hours with 256 cpu Batch environment
* FSx for Lustre population during training initialization - takes 5 hours
* Training - takes one hour on ml.p3.2xlarge, or 4 hours on ml.c5.9xlarge

NOTES: 

* In this example BBBC-021 project the images are relatively small, however, this architecture is designed to handle substantially larger imagery - this is the general reason for the fine-grain job management approach.

* If something goes wrong before the image processing phase is complete, this step should be re-run from the beginning without modification - each Batch job checks to see if its results exist so will immediately exit without recomputing the result.

* The first time the training data is read from S3 to FSx for Lustre, the read will be slow as the data is copied to Lustre. Any subsequent read of the same file will be much faster. This means this first training step will take a while to load, but the subsequent MOA training jobs will be much faster.

* If something goes wrong with the training step (i.e., after the image processing phase has completed), the ‘executeProcessPlate’ flag should be set to ‘false’ to completely skip the image processing step, which has already completed successfully. For clarity, each time the training is re-run, the corresponding “trainId” row entry of the previous unsuccessful run(s) in the “BioimsTrainingConfiguration” table should be deleted (although this is not required for the new run to be processed). This can be done in the DynamoDB console.

### Compute Embeddings for Baseline Model

```
cd bioimage-search/datasets/bbbc-021/scripts
source venv/bin/activate
python embedding-compute-helper.py 0 <trainId> ''
```

### Inspect Baseline Training results with SageMaker Notebook

Go to the SageMaker service and open SageMaker Studio (which was setup during a previous step above).

Using the “folder” icon on the left pane, navigate here and open this notebook:

```
bioimage-search/datasets/bbbc-021/notebooks/bbbc021-baseline-analysis.ipynb
```

In the upper-right, change the kernel to “Python 3 Data Science”, and change the instance type from “unknown” to ml.m5.large. Following the message popup, it may take several minutes for the instance to start.

Add needed permissions to the “AmazonSageMaker-ExecutionRole-*” that was auto-created for SageMaker Studio:

* Go to the IAM service
* Click “Roles” on left pane
* Search for “ExecutionRole” - a role something like ‘AmazonSageMaker-ExecutionRole-20210322T143540’ should appear.
* Click on this role
* Click the blue button “Attach policies”
* Type “Bioimage” in the search box
* A managed policy with a name like this should appear: BioimageSearchResourcePermissionsStack-biomageSearchManagedPolicy9CB9C1D7-1H0ZCXA0DIOJ8
* Select this role and then click the “Attach policy” blue button at the bottom of the window

Next, change the ‘trainId’ in the notebook to match the trainId of the ‘baseline’ model above. This info can be obtained in the console by using the DynamoDB browser for the ‘BioimsTrainingConfiguration’ table.

Notebook at completion should show both correlation matrix and t-SNE projection, providing insight into how successfully the model + hyperparameters has created an embedding for distinguishing between MOA types.

**NOTE: the clustering and the correlation matrix can be made, to a large extent, arbitrarily perfect by increasing training epochs - HOWEVER - with the example model and data in this project, the ability of the network to generalize to novel test data rapidly deteriorates with these same additional training cycles. Past an early initial point, better clustering in the baseline case does not lead to better generalization performance.**

### Create and Upload Compound Image Filter Lists

This will generate, for each compound, a list of corresponding imageIds. These lists will be used to create customized training sets for each compound-specific model that leaves out these images from its training set, for the purpose of testing the capacity of the model to generalize.

Example usage:

```
cd bioimage-search/datasets/bbbc-021/scripts
python generate_train_filters.py --bbbc021-bucket bioimagesearchbbbc021stack-bbbc021bucket544c3e64-ugln15rb234b --bioims-resource-bucket bioims-resource-1 —embeddingName bbbc021-1
```

This will upload lists to the resource s3 bucket at this location:

<bucket>/train-filter/<embedding>/*

### Train MOA-specific Models

If your account has Service Quota limits for SageMaker GPU instance types (e.g., ml.p3.2xlarge or ml.g4dn.4large), these are recommended for this project - they are about 5x faster per training unit for the default model in this project than CPU instances (note this factor tends to go up the more parameters and layers in the model, and vice-versa if the model is simpler).

The instance type for training is specified in the “trainingInstanceType” field of the embedding, in the "BioimsTrainingConfiguration" table, in the row with trainId=‘origin’ for a particular embedding. The simplest way to train all models is to leave the “trainingInstanceType” field set to the preferred instance type, and run this compound command:

```
cd bioimage-search/datasets/bbbc-021/scripts
python get-train-input-helper.py --bbbc021-bucket <bbbc021 bucket>  --bioims-resource-bucket <resource bucket> --embeddingName <embedding name> | xargs -n 3 -P <max#jobs> python ./run-training-helper.py
```

Where "<max#jobs>" is the number of concurrent training jobs (there are 38 jobs required to generate a model for each compound). As with all xargs commands, -P specifies the degree of concurrency. -P <#> should be no higher than the maximum number of permitted concurrent SageMaker training jobs for the account.

The project assumes Service Quota limits are not an issue. If your account does not have Service Quota settings for SageMaker that permit a large number of concurrent training jobs for a single ml instance type, then the following step-wise manual approach can be used to speed things up.

Let’s consider a “minimal” scenario where no GPU types are permitted, but these types and counts are available:
ml.c4.8xlarge (5) NOTE: we will use 3 in practice, since our overall limit is 10 (see below)
ml.c5.9xlarge (2)
ml.c5.9xlarge (2)
ml.m5.4xlarge (5)
Let’s also assume a maximum of 10 concurrent training jobs is permitted.

Create 3 terminal shells, one intended to be used for each group.

Then, in each shell corresponding to a particular instance type, run something like this, making sure to advance <max entry> with each invocation:

python get-train-input-helper.py --bbbc021-bucket <bbbc021 bucket>  --bioims-resource-bucket <resource bucket> --embeddingName <embedding name> | head -n <max entry> | tail -n <entry window size> | xargs -n 3 -P <entry window size> python ./run-training-helper.py

NOTE: Each group will need to be launched (and manually re-launched to repeat) with adjusted “max entry” position, being sure to edit the “trainingInstanceType” entry in the “BioimsTrainingConfiguration” row each time before starting, so that these jobs are launched with the intended instance type specified (edits are relatively easy in the DynamoDB console).

### Compute MOA Model Embeddings

```
cd bioimage-search/datasets/bbbc-021/scripts
python get-trainlist-helper.py bbbc021-1 | xargs -n 3 -P 4 python ./embedding-compute-helper.py
```

The -P <#concurrency> can be adjusted, but the higher the value the more likely a throttling limit may be hit - the success of all StepFunctions executions can be checked in the console. Re-rerunning a failed invocation can be done with the “New Execution” button if there is a failure due to a throttle or API timeout.

### Upload MOA Embeddings to Search Service

```
cd bioimage-serch/datasets/bbbc-021/scripts
python get-trainlist-helper.py bbbc021-1 | xargs -n 3 -P 5 python ./embedding-upload-helper.py
```

### Generate Tags

This will populate the BioimsTag table with tags for the bbbc021 dataset (bucket names are examples):

```
python generate_tags.py --bbbc021-bucket bioimagesearchbbbc021stack-bbbc021bucket544c3e64-ugln15rb234b --bioims-resource-bucket bioims-resource-1 —embeddingName bbbc021-1
```

### Apply Tags to Images

This applies tags to the BioimsImageManagement table:

```
cd bioimage-search/datasets/bbbc-021/scripts
python apply-tags.py --bbbc021-bucket bioimagesearchbbbc021stack-bbbc021bucket544c3e64-ugln15rb234b --bioims-resource-bucket bioims-resource-1 —embeddingName bbbc021-1
```

### Upload Tags to Search Service

```
cd bioimage-search/cli/bioims
deactivate
source venv/bin/activate
cd test
```

EDIT the file “test-search.py”, adding the correct name of the embedding in this line, then run the script:

```
r = searchClient.startTagLoad(<embeddingName>)

python test-search.py
```

Observe the running instance of SearchTagLoaderStateMachine in the StepFunctions console to ensure it completes successfully.

### MOA Analysis Notebook

Open SageMaker studio (see setup instructions above), and update the project if needed with git.

Open the MOA analysis notebook at this location, using a “Python 3 (Data Science)” kernel, and preferably an instance type with 2 vCPU + 8 GiB (e.g,. ml.m5.large).

```
bioimage-search/datasets/bbbc-021/notebooks/bbbc021-moa-analysis.ipynb
```

Modify these fields at the top of the notebook:

EMBEDDING_NAME
BASELINE_TRAIN_ID
bioimsArtifactBucket (the ‘data’ bucket for the project, e.g., ‘bioims-data-1’)
bbbc021Bucket

Step through the notebook. The steps are intended to check the validity of the state of the system before performing the final search step. The final search analysis step will take 1-2 hours to run using the default instance size of the Fargate search service, as specified in the Bioims

The results will show, for each ML model corresponding to each compound, its performance at generalizing to the actual MOA for that compound.

Finally, the notebook will show the overall “top-hit” accuracy for the model used for training.

The “bbbc021-1” model should score just under the 90% level, using default training parameters.

As stated earlier, the default model is very sensitive to over-training on this dataset - its performance rapidly peaks and then steadily declines with further training epochs.


#!/bin/sh

# The S3 repo sync is no longer needed - plan on removing:

#S3_BUCKET_NAME="bioimage-search-43762"
#S3_PREFIX="repository"

#aws s3 mb s3://${S3_BUCKET_NAME}
#aws s3 sync ./ s3://${S3_BUCKET_NAME}/${S3_PREFIX} --delete

source ./scripts/source-nvm.sh
npm run build

cd src/message; npm install; cd ../..
cd src/image-management; npm install; cd ../..
cd src/process-plate; npm install; cd ../..
cd src/train; npm install; cd ../..
cd src/artifact; npm install; cd ../..

cd src/image-artifact/lambda/default-artifact; ./build.sh; cd ../../../..
cd src/plate-preprocessing; ./build.sh; cd ../..
cd src/image-preprocessing; ./build.sh; cd ../..
cd src/configuration; ./build.sh; cd ../..
cd src/label; ./build.sh; cd ../..
cd src/message; ./build.sh; cd ../..
cd src/training-configuration; ./build.sh; cd ../..
cd src/artifact; ./build.sh; cd ../..
cd src/image-management; ./build.sh; cd ../..
cd src/image-inspector; ./build.sh; cd ../..
cd src/process-plate; ./build.sh; cd ../..
cd src/training-build; ./build.sh; cd ../..
cd src/training-compute; ./build.sh; cd ../..
cd src/train; ./build.sh; cd ../..

cdk bootstrap

cdk deploy BioimageSearchBaseStack --require-approval never
cdk deploy BioimageSearchLustreStack --require-approval never
cdk deploy BioimageSearchBatchSetupStack --require-approval never
cdk deploy BioimageSearchConfigurationStack --require-approval never
cdk deploy BioimageSearchLabelStack --require-approval never
cdk deploy BioimageSearchMessageStack --require-approval never
cdk deploy BioimageSearchImageArtifactStack --require-approval never
cdk deploy BioimageSearchPlatePreprocessingStack --require-approval never
cdk deploy BioimageSearchImagePreprocessingStack --require-approval never
cdk deploy BioimageSearchTrainingConfigurationStack --require-approval never
cdk deploy BioimageSearchArtifactStack --require-approval never
cdk deploy BioimageSearchImageManagementStack --require-approval never
cdk deploy BioimageSearchProcessPlateStack --require-approval never
cdk deploy BioimageSearchTrainStack --require-approval never
cdk deploy BioimageSearchResourcePermissionsStack --require-approval never

cd scripts; ./fsxl-set-import-policy.sh; cd ..

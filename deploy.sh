#!/bin/sh

# The S3 repo sync is no longer needed - plan on removing:

#S3_BUCKET_NAME="bioimage-search-43762"
#S3_PREFIX="repository"

#aws s3 mb s3://${S3_BUCKET_NAME}
#aws s3 sync ./ s3://${S3_BUCKET_NAME}/${S3_PREFIX} --delete

source ./scripts/source-nvm.sh
npm run build
cdk bootstrap
cdk deploy BioimageSearchBaseStack --require-approval never
cdk deploy BioimageSearchConfigurationStack --require-approval never


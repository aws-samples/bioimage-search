#!/bin/sh

source ../../main/scripts/source-nvm.sh
npm run build
cdk bootstrap
cdk deploy BioimageSearchBbbc021Stack --require-approval never

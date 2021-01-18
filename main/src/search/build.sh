rm -rf ./build
mkdir -p build
mkdir -p build/node_modules/bioimage-dynamo
mkdir -p build/node_modules/bioimage-lambda
cp ../common-node/bioimage-dynamo.js ./build/node_modules/bioimage-dynamo/index.js
cp ../common-node/bioimage-lambda.js ./build/node_modules/bioimage-lambda/index.js
cp *.js ./build
cp -r node_modules/* build/node_modules

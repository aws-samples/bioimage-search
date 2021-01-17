rm -rf ./build
mkdir -p build
mkdir -p build/node_modules/bioimage-lambda
cp ../common-node/bioimage-lambda.js ./build/node_modules/bioimage-lambda/index.js
cp *.js ./build

rm -rf ./build
mkdir -p build
mkdir -p build/node_modules/bioimage-dynamo
cp ../common-node/bioimage-dynamo.js ./build/node_modules/bioimage-dynamo/index.js
cp *.js ./build
cp -r node_modules/* build/node_modules

mkdir -p build
mkdir -p build/node_modules
cp ../common-node/bioimage-dynamo.js ./build/node_modules
cp *.js ./build
cp -r node_modules/* build/node_modules

rm -rf ./build
mkdir -p build
cp training-compute.py ./build
cp ../common/bioimagepath.py ./build
cp ../../../cli/bioims/src/bioims.py ./build
cd build
python3.8 -m venv venv
source venv/bin/activate
pip install shortuuid
pip install numpy
pip install sagemaker
pip install pandas
cp -r venv/lib64/python3.8/site-packages/* .
rm -r venv
rm -r pip
cd ..
deactivate

# Build script for default-artifact lambda
mkdir -p build
cp default-artifact.py ./build
cp ../../../common/bioimageimage.py ./build
cd build
python3.8 -m venv venv
source venv/bin/activate
pip install numpy
pip install Pillow
pip install scikit-image
cp -r venv/lib64/python3.8/site-packages/* .
rm -r venv
cd ..
deactivate

rm -rf ./build
mkdir -p build
cp image-inspector.py ./build
cp ../common/bioimageimage.py ./build
cd build
python3.8 -m venv venv
source venv/bin/activate
pip install shortuuid
pip install Pillow
pip install numpy
pip install scikit-image
cp -r venv/lib64/python3.8/site-packages/* .
rm -r venv
cd ..
deactivate

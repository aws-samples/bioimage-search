rm -rf ./build
mkdir -p build
cp training-build.py ./build
cp ../common/bioimagepath.py ./build
cp ../../../cli/bioims/src/bioims.py ./build
cd build
python3.8 -m venv venv
source venv/bin/activate
pip install shortuuid
pip install Pillow
pip install numpy
pip install scikit-image
cp -r venv/lib64/python3.8/site-packages/* .
rm -r venv
rm -r skimage/filters
rm -r skimage/feature
rm -r skimage/morphology
rm -r skimage/restoration
rm -r skimage/segmentation
rm -r skimage/draw
rm -r skimage/measure
rm -r pip
rm -r matplotlib
cd ..
deactivate

FROM ubuntu:18.04

RUN apt-get update && \
    apt-get install -y \
    python3-pip && \
    pip3 install boto3 && \
    pip3 install pandas && \
    pip3 install pillow && \
    pip3 install scipy && \
    pip3 install scikit-image && \
    pip3 install shortuuid

COPY ./build/bioimageimage.py /
COPY image-preprocessing.py /

ENTRYPOINT ["python3", "/image-preprocessing.py"]
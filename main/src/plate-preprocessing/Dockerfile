FROM ubuntu:latest

RUN apt-get update && \
    apt-get install -y \
    python3-pip && \
    pip3 install boto3 && \
    pip3 install s3fs && \
    pip3 install pandas && \
    pip3 install pillow && \
    pip3 install scikit-image && \
    pip3 install shortuuid

COPY ./build/bioimageimage.py /
COPY ./build/bioims.py /
COPY plate-preprocessing.py /

ENTRYPOINT ["python3", "/plate-preprocessing.py"]
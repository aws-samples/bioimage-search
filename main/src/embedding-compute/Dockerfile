FROM public.ecr.aws/lambda/python:3.8

RUN pip3 install numpy && \
    pip3 install torch && \
    pip3 install torchvision && \
    pip3 install s3fs && \
    pip3 install sagemaker && \
    pip3 install shortuuid

COPY ./build/bioimagepath.py ${LAMBDA_TASK_ROOT}

COPY ./build/bioims.py ${LAMBDA_TASK_ROOT}

COPY embedding-compute.py ${LAMBDA_TASK_ROOT} 

CMD [ "embedding-compute.handler" ]

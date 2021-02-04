## Bioimage Search

NOTE: this project is in (pre-release)^2.

* There is no documentation (yet)
* The code has been minimally tested
* There are likely to be significant and high-frequency code changes

### Project Summary

This is a "Proof of Concept" project that provides an example architecture of:

* A serverless ML-Ops environment for creating and managing embeddings on arbitrary image sets
* A search service for finding nearest neighbors
* A design that can be efficiently scaled and extended with the AWS CDK

## Security

See [CONTRIBUTING](CONTRIBUTING.md#security-issue-notifications) for more information.

## License

This project is licensed under the Apache-2.0 License.

## Setup (tested on Cloud9 Amazon Linux)

Initial install:

    ./install.sh

To initialize bash shell:

    source ./main/scripts/source-env.sh

To install python3.8:

    bash ./scripts/main/source-python.sh

To install the BBBC-021 dataset in S3 (30 min):

    cd datasets/bbbc-021; ./deploy.sh

To deploy main stack set. This creates IAM user automatically.
Once created, the credentials should be installed as an aws cli profile
to use command-line functions.

    ./main/deploy.sh

To setup "bioimage search" cli:

    export AWS_PROFILE=<profile name>
    cd cli/bioims
    python3.8 -m venv venv
    source venv/bin/activate
    python3.8 -m pip install -r requirements.txt

Once deployed, this system can be used in a variety of ways concurrently:

* By a user on the command line using the bioims cli
* By calling the Lambda function methods for the various microservices
* By writing new AWS functions that interact with the project components

## Notes

* The amplify section is just a stub that may be developed for future use. If not, it will be removed.
* A notebook has been added for baseline bbbc-021 model check, under dataasets/bbbc-021/notebooks

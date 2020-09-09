## My Project

TODO: Fill this README out!

Be sure to:

* Change the title in this README
* Edit your repository description on GitHub

## Security

See [CONTRIBUTING](CONTRIBUTING.md#security-issue-notifications) for more information.

## License

This project is licensed under the Apache-2.0 License.

## Setup

For initial setup:

    source ./scripts/source-env.sh

To install python3.8:

    bash ./scripts/source-python.sh

To install the BBBC-021 dataset in S3:

    ./deployBbbc021.sh

To deploy main stack set:

    ./deploy.sh

To setup cli:

    cd cli/bioims
    python3.8 -m venv venv
    source venv/bin/activate
    python3.8 -m pip install -r requirements.txt


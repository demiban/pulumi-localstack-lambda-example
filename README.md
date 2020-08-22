# pulumi-localstack-lambda-example

Example project for deploying aws serverless lambda to localstack with pulumi.

## Setup

### In the terminal run the following commands:

Install required packages 
`$ make setup`  

Start localStack docker
`$ make up`

## Test the application

### Deploy

Run `$ make deploy`

output:

```bash
  Outputs:
      endpoint: "http://localhost:4567/restapis/5243580167/dev/_user_request_/mypath"
  
  Resources:
      + 10 created
  
  Duration: 15s
  
  Permalink: https://app.pulumi.com/demiban/localstack-demo-dev/updates/1
```

### Destroy

Run `$ make destroy`

### Configuration

1. Create the `.env` with the following variables:

```bash
export REGION=us-east-1
export STAGE=local
export LS_VERSION=latest
```

To deploy to AWS just change the `STAGE` value to `prod`

const pulumi = require("@pulumi/pulumi");
const aws = require("@pulumi/aws");
const endpoints = require('./localstack-endpoints.json');
require('dotenv').config();

const PATH = "mypath"
const STAGE = process.env.STAGE
const REGION = process.env.REGION
const NAME = process.env.APP_NAME

////////////////////////
// Create AWS Provider
////////////////////////

let awsProvider;

// Create the aws provider depending the stage of deployment
if (STAGE == "prod") {
    awsProvider = new aws.Provider("aws", { region: REGION });
} else {
    awsProvider = new aws.Provider("localstack", {
        skipCredentialsValidation: true,
        skipMetadataApiCheck: true,
        s3ForcePathStyle: true,
        accessKey: "mockAccessKey",
        secretKey: "mockSecretKey",
        region: REGION,
        endpoints: [{
            apigateway: endpoints.APIGateway,
            cloudformation: endpoints.CloudFormation,
            cloudwatch: endpoints.CloudWatch,
            cloudwatchlogs: endpoints.CloudWatchLogs,
            dynamodb: endpoints.DynamoDB,
            es: endpoints.ES,
            firehose: endpoints.Firehose,
            iam: endpoints.IAM,
            kinesis: endpoints.Kinesis,
            kms: endpoints.KMS,
            lambda: endpoints.Lambda,
            route53: endpoints.Route53,
            redshift: endpoints.Redshift,
            s3: endpoints.S3,
            ses: endpoints.SES,
            sns: endpoints.SNS,
            sqs: endpoints.SQS,
            ssm: endpoints.SSM,
            sts: endpoints.STS,
        }],
    })
}

//////////////////////////
// Setup Lambda IAM role
//////////////////////////

const policy = {
    "Version": "2012-10-17",
    "Statement": [
        {
            "Action": "sts:AssumeRole",
            "Principal": {
                "Service": "lambda.amazonaws.com",
            },
            "Effect": "Allow",
            "Sid": "",
        },
    ],
};

////////////////////
// Create IAM Role
////////////////////
// Todo:    Use localstack IAM once time format bug gets fixed
//          Issue: https://github.com/localstack/localstack/issues/1208
const role = new aws.iam.Role(
    `${NAME}-lambda-role`,
    { assumeRolePolicy: JSON.stringify(policy),},
    // { provider: awsProvider,}
);

///////////////////////////
// Create IAM Role Policy
///////////////////////////

const fullAccess = new aws.iam.RolePolicyAttachment(
    `${NAME}-lambda-access`,
    { role: role,
            policyArn: aws.iam.AWSLambdaFullAccess,},
    // {provider: awsProvider,}
    );

//////////////////
// Create Lambda
//////////////////

const lambdaNode = new aws.lambda.Function(
    `${NAME}-lambda-node`,
    { runtime: aws.lambda.NodeJS6d10Runtime,
            code: new pulumi.asset.FileArchive("./node/handler.zip"),
            timeout: 5,
            handler: "handler.handler",
            role: role.arn,},
    { provider: awsProvider,
            dependsOn: fullAccess,}
);

// Todo: Resolve go runtime issue with localstack lambda container
//       Reference: https://github.com/localstack/localstack/issues/561
// const lambdaGo = new aws.lambda.Function( `${NAME}-lambda-go`, {
//     runtime: aws.lambda.Go1dxRuntime,
//     code: new pulumi.asset.FileArchive("./golang/main.zip"),
//     timeout: 5,
//     handler: "main",
//     role: role.arn,
// }, {
//     provider: awsProvider,
//     dependsOn: fullAccess,
// });

/////////////////////
// Setup APIGATEWAY
/////////////////////

// The following creates a REST API equivalent to the following Swagger specification:
//
//    {
//      swagger: "2.0",
//      info: { title: "localstack-demo-api", version: "1.0" },
//      paths: {
//        "/mypath": {
//          "x-amazon-apigateway-any-method": {
//            "x-amazon-apigateway-integration": {
//              uri: ,
//              passthroughBehavior: "when_no_match",
//              httpMethod: "POST",
//              type: "aws_proxy",
//            },
//          },
//        },
//      },
//    };

// TODO:    Use this fucntion to deploy the RESTApi once pulumi releases the updated
//          version that enables to pass the provider has an argument.
//          This will simplify the implementation.
// let restApi = new aws.apigateway.x.API(
//     `${NAME}-api`,
//     { routes: [{
//                 path: `/${PATH}`,
//                 method: "GET",
//                 eventHandler: lambdaNode
//             }],},
//     { provider: awsProvider,}
// );

//////////////////////
// Create APIGATEWAY
//////////////////////

let restApi = new aws.apigateway.RestApi(
    `${NAME}-api`,
    { body: "",},
    { provider: awsProvider,}
);

////////////////////////////
// Create RestApi Resource
////////////////////////////

const resource = new aws.apigateway.Resource(
    `${NAME}-api-resource`,
    { restApi: restApi,
            pathPart: `${PATH}`,
            parentId: restApi.rootResourceId,},
    { provider: awsProvider,}
);

//////////////////////////
// Create RestAPI Method
//////////////////////////

const method = new aws.apigateway.Method(
    `${NAME}-api-method`,
    { restApi: restApi,
            resourceId: resource.id,
            httpMethod: "ANY",
            authorization: "NONE",},
    { provider: awsProvider,}
);

///////////////////////////////////
// Set RestApi Lambda Integration
///////////////////////////////////

const integration = new aws.apigateway.Integration(
    `${NAME}-api-integration`,
    { restApi: restApi,
            resourceId: resource.id,
            httpMethod: "ANY",
            type: "AWS_PROXY",
            integrationHttpMethod: "POST",
            passthroughBehavior: "WHEN_NO_MATCH",
            uri: lambdaNode.arn.apply(
                arn => arn && `arn:aws:apigateway:${REGION}:lambda:path/2015-03-31/functions/${arn}/invocations`
            ),},
    { dependsOn: [ method ],
            provider: awsProvider,}
);

///////////////////
// Deploy RestApi
///////////////////

const deployment = new aws.apigateway.Deployment(
    `${NAME}-api-deployment`,
    { restApi: restApi,
            description: `${NAME} deployment`,
            stageName: STAGE,},
    { dependsOn: [ integration ],
            provider: awsProvider,}
);

////////////////////////////////////////
// Create Lambda APIGATEWAY Permission
////////////////////////////////////////

// Note: Lambda permission is only required when deploying to AWS cloud
if (STAGE == "prod") {
    // Give permissions from API Gateway to invoke the Lambda
    let invokePermission = new aws.lambda.Permission(
        `${NAME}-api-lambda-permission`,
        { action: "lambda:invokeFunction",
                function: lambdaNode,
                principal: "apigateway.amazonaws.com",
                sourceArn: deployment.executionArn.apply(arn => arn + "*/*"),},
        { provider: awsProvider,}
    );
}

//////////////////////////////////
// Export RestApi https endpoint
//////////////////////////////////

let endpoint;

if (STAGE == "prod") {
    endpoint = deployment.invokeUrl.apply(url => url + `/${PATH}`);
} else{
    endpoint = restApi.id.promise().then(
        () => restApi.id.apply(id => `http://localhost:4567/restapis/${id}/${process.env.STAGE}/_user_request_/${PATH}`)
    );
}

exports.endpoint = endpoint;



const pulumi = require("@pulumi/pulumi");
const aws = require("@pulumi/aws");
const config = require('./conf.json');
const path = "mypath"
require('dotenv').config();

////////////////////////
// Create AWS Provider
////////////////////////

let awsProvider;

// Create the aws provider depending the stage of deployment
if (process.env.STAGE == "dev") {
    awsProvider = new aws.Provider("localstack", {
        skipCredentialsValidation: true,
        skipMetadataApiCheck: true,
        s3ForcePathStyle: true,
        accessKey: "mockAccessKey",
        secretKey: "mockSecretKey",
        region: process.env.REGION,
        endpoints: [{
            apigateway: "http://localhost:4567",
            cloudformation: "http://localhost:4581",
            cloudwatch: "http://localhost:4582",
            dynamodb: "http://localhost:4569",
            es: "http://localhost:4578",
            kinesis: "http://localhost:4568",
            lambda: "http://localhost:4574",
            s3: "http://localhost:4572",
            sqs: "http://localhost:4576",
            sns: "http://localhost:4575",
            ssm: "http://localhost:4583"
        }],
    })
}
else {
    awsProvider = new aws.Provider("aws", { region: process.env.REGION });
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

const role = new aws.iam.Role(`${config.name}-lambda-role`, {
    assumeRolePolicy: JSON.stringify(policy),
 }, {
 //provider: awsProvider,
});

///////////////////////////
// Create IAM Role Policy
///////////////////////////

const fullAccess = new aws.iam.RolePolicyAttachment(`${config.name}-lambda-access`, {
    role: role,
    policyArn: aws.iam.AWSLambdaFullAccess,
}, {
//    provider: awsProvider,
});

//////////////////
// Create Lambda
//////////////////

const lambda = new aws.lambda.Function( `${config.name}-lambda`, {
    runtime: aws.lambda.NodeJS6d10Runtime,
    code: new pulumi.asset.FileArchive("./handler/handler.zip"),
    timeout: 5,
    handler: "handler.handler",
    role: role.arn,
}, {
    provider: awsProvider,
    dependsOn: fullAccess,
});

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
// let api = new aws.apigateway.x.API(`${config.name}-api`, {
//     routes: [{
//         path: `/${path}`,
//         method: "GET",
//         eventHandler: lambda
//     }],
// }, {
//     provider: awsProvider,
// });

//////////////////////
// Create APIGATEWAY
//////////////////////

let restApi = new aws.apigateway.RestApi(`${config.name}-api`, {
    body: "",
}, {
    provider: awsProvider,
});

////////////////////////////
// Create RestApi Resource
////////////////////////////

const resource = new aws.apigateway.Resource(`${config.name}-api-resource`, {
    restApi: restApi,
    pathPart: `${path}`,
    parentId: restApi.rootResourceId,
}, {
    provider: awsProvider,
});

//////////////////////////
// Create RestAPI Method
//////////////////////////

const method = new aws.apigateway.Method(`${config.name}-api-method`, {
    restApi: restApi,
    resourceId: resource.id,
    httpMethod: "ANY",
    authorization: "NONE",
}, {
    provider: awsProvider,
});

///////////////////////////////////
// Set RestApi Lambda Integration
///////////////////////////////////

const integration = new aws.apigateway.Integration(`${config.name}-api-integration`, {
    restApi: restApi,
    resourceId: resource.id,
    httpMethod: "ANY",
    type: "AWS_PROXY",
    integrationHttpMethod: "POST",
    passthroughBehavior: "WHEN_NO_MATCH",
    uri: lambda.arn.apply(arn =>
        arn && `arn:aws:apigateway:${process.env.REGION}:lambda:path/2015-03-31/functions/${arn}/invocations`),
}, {
    dependsOn: [ method ],
    provider: awsProvider,
});

///////////////////
// Deploy RestApi
///////////////////

const deployment = new aws.apigateway.Deployment(`${config.name}-api-deployment`, {
    restApi: restApi,
    description: `${config.name} deployment`,
    stageName: process.env.STAGE,
}, {
    dependsOn: [ integration ],
    provider: awsProvider,
});

////////////////////////////////////////
// Create Lambda APIGATEWAY Permission
////////////////////////////////////////

// Note: Lambda permission is only required when deploying to AWS cloud
if (process.env.STAGE == "prod") {
    // Give permissions from API Gateway to invoke the Lambda
    let invokePermission = new aws.lambda.Permission(`${config.name}-api-lambda-permission`, {
        action: "lambda:invokeFunction",
        function: lambda,
        principal: "apigateway.amazonaws.com",
        sourceArn: deployment.executionArn.apply(arn => arn + "*/*"),
    }, {
        provider: awsProvider,
    });
}

//////////////////////////////////
// Export RestApi https endpoint
//////////////////////////////////

let endpoint;

if (process.env.STAGE == "dev") {
    endpoint = restApi.id.promise().then(() => restApi.id.apply(id => `http://localhost:4567/restapis/${id}/${process.env.STAGE}/_user_request_/${path}`));
} else {
    endpoint = deployment.invokeUrl.apply(url => url + `/${path}`);
}

exports.endpoint = endpoint;



require('dotenv').config();
const pulumi = require('@pulumi/pulumi');
const aws = require('@pulumi/aws');
const awsx = require('@pulumi/awsx');
const endpoints = require('./config/localstack-endpoints.json');

const name = pulumi.getProject();
const stage = process.env.STAGE;
const region = process.env.REGION;

//------------------------------------------------------------------------------
// Create AWS Provider
//------------------------------------------------------------------------------

// Create the aws provider depending the stage of deployment
let provider;
if (stage === 'local') {
  provider = new aws.Provider('localstack', {
    skipCredentialsValidation: true,
    skipMetadataApiCheck: true,
    skipRegionValidation: true,
    skipRequestingAccountId: true,
    skipGetEc2Platforms: true,
    s3ForcePathStyle: true,
    insecure: true,
    accessKey: 'mockAccessKey',
    secretKey: 'mockSecretKey',
    maxRetries: 5,
    region,
    endpoints: [
      {
        apigateway: endpoints.APIGateway,
        cloudformation: endpoints.CloudFormation,
        cloudwatch: endpoints.CloudWatch,
        cloudwatchlogs: endpoints.CloudWatchLogs,
        cognitoidentity: endpoints.CognitoIdendity,
        dynamodb: endpoints.DynamoDB,
        ec2: endpoints.EC2,
        ecs: endpoints.ECS,
        elasticache: endpoints.ElasticCache,
        es: endpoints.ES,
        firehose: endpoints.Firehose,
        iam: endpoints.IAM,
        iot: endpoints.IoT,
        kinesis: endpoints.Kinesis,
        kms: endpoints.KMS,
        lambda: endpoints.Lambda,
        rds: endpoints.RDS,
        route53: endpoints.Route53,
        redshift: endpoints.Redshift,
        s3: endpoints.S3,
        secretsmanager: endpoints.SecretsManager,
        ses: endpoints.SES,
        sns: endpoints.SNS,
        sqs: endpoints.SQS,
        ssm: endpoints.SSM,
        stepfunctions: endpoints.StepFunctions,
        sts: endpoints.STS
      }
    ]
  });
} else {
  provider = new aws.Provider('aws', { region });
}

//------------------------------------------------------------------------------
// Setup Lambda IAM role
//------------------------------------------------------------------------------

const policy = {
  Version: '2012-10-17',
  Statement: [
    {
      Action: 'sts:AssumeRole',
      Principal: {
        Service: 'lambda.amazonaws.com'
      },
      Effect: 'Allow',
      Sid: ''
    }
  ]
};

//------------------------------------------------------------------------------
// Create IAM Role
//------------------------------------------------------------------------------
const role = new aws.iam.Role(
  `${name}-lambda-role`,
  {
    assumeRolePolicy: JSON.stringify(policy),
    tags: {
      Environment: stage
    }
  },
  {
    provider
  }
);

//------------------------------------------------------------------------------
// Create IAM Role Policy
//------------------------------------------------------------------------------

const fullAccess = new aws.iam.RolePolicyAttachment(
  `${name}-lambda-access`,
  {
    role,
    policyArn: aws.iam.AWSLambdaFullAccess,
    tags: {
      Environment: stage
    }
  },
  {
    provider
  }
);

//------------------------------------------------------------------------------
// Create Lambda
//------------------------------------------------------------------------------

const lambdaNode = new aws.lambda.Function(
  `${name}-lambda-node`,
  {
    runtime: aws.lambda.NodeJS10dXRuntime,
    code: new pulumi.asset.FileArchive('./functions/node/handler.zip'),
    timeout: 300,
    handler: 'handler.handler',
    role: role.arn,
    publish: true,
    tags: {
      Environment: stage
    }
  },
  {
    provider,
    dependsOn: fullAccess
  }
);

const lambdaGo = new aws.lambda.Function(
  `${name}-lambda-go`,
  {
    runtime: aws.lambda.Go1dxRuntime,
    code: new pulumi.asset.FileArchive('./functions/golang/main.zip'),
    timeout: 300,
    handler: 'main',
    role: role.arn,
    publish: true,
    tags: {
      Environment: stage
    }
  },
  {
    provider,
    dependsOn: fullAccess
  }
);

//------------------------------------------------------------------------------
// Setup APIGATEWAY
//------------------------------------------------------------------------------

// TODO:    Use this function to deploy the RESTApi once pulumi releases the updated
//          version that enables to pass the provider has an argument.
//          This will simplify the implementation.

const restApi = new awsx.apigateway.API(
  `${name}-api-new`,
  {
    routes: [
      {
        path: `/nodejs`,
        method: 'ANY',
        eventHandler: lambdaNode,
        apiKeyRequired: false
      },
      {
        path: `/golang`,
        method: 'ANY',
        eventHandler: lambdaGo,
        apiKeyRequired: false
      }
    ],
    stageName: stage,
    restApiArgs: {
      body: ''
    },
    tags: {
      Environment: stage
    }
  },
  {
    provider
  }
);

//------------------------------------------------------------------------------
// Create APIGATEWAY
//------------------------------------------------------------------------------

// const restApi = new aws.apigateway.RestApi(
//   `${name}-api`,
//   {
//     body: '',
//     tags: {
//       Environment: stage
//     }
//   },
//   { provider }
// );

// // ------------------------------------------------------------------------------
// // Create RestApi Resource
// // ------------------------------------------------------------------------------

// const resourceGo = new aws.apigateway.Resource(
//   `${name}-api-resource-go`,
//   {
//     restApi,
//     pathPart: `golang`,
//     parentId: restApi.rootResourceId,
//     tags: {
//       Environment: stage
//     }
//   },
//   { provider }
// );

// const resourceNode = new aws.apigateway.Resource(
//   `${name}-api-resource-node`,
//   {
//     restApi,
//     pathPart: `node`,
//     parentId: restApi.rootResourceId,
//     tags: {
//       Environment: stage
//     }
//   },
//   { provider }
// );

// // ------------------------------------------------------------------------------
// // Create RestAPI Method
// // ------------------------------------------------------------------------------

// const methodGo = new aws.apigateway.Method(
//   `${name}-api-method-go`,
//   {
//     restApi,
//     resourceId: resourceGo.id,
//     httpMethod: 'GET',
//     authorization: 'NONE',
//     tags: {
//       Environment: stage
//     }
//   },
//   { provider }
// );

// const methodNode = new aws.apigateway.Method(
//   `${name}-api-method-node`,
//   {
//     restApi,
//     resourceId: resourceNode.id,
//     httpMethod: 'GET',
//     authorization: 'NONE',
//     tags: {
//       Environment: stage
//     }
//   },
//   { provider }
// );

// // ------------------------------------------------------------------------------
// // Set RestApi Lambda Integration
// // ------------------------------------------------------------------------------

// const integrationGo = new aws.apigateway.Integration(
//   `${name}-api-integration-go`,
//   {
//     restApi,
//     resourceId: resourceGo.id,
//     httpMethod: 'ANY',
//     type: 'AWS_PROXY',
//     integrationHttpMethod: 'POST',
//     passthroughBehavior: 'WHEN_NO_MATCH',
//     uri: lambdaGo.arn.apply(
//       arn =>
//         arn &&
//         `arn:aws:apigateway:${region}:lambda:path/2015-03-31/functions/${arn}/invocations`
//     ),
//     tags: {
//       Environment: stage
//     }
//   },
//   { dependsOn: [methodGo], provider }
// );

// const integrationNode = new aws.apigateway.Integration(
//   `${name}-api-integration-node`,
//   {
//     restApi,
//     resourceId: resourceNode.id,
//     httpMethod: 'ANY',
//     type: 'AWS_PROXY',
//     integrationHttpMethod: 'POST',
//     passthroughBehavior: 'WHEN_NO_MATCH',
//     uri: lambdaNode.arn.apply(
//       arn =>
//         arn &&
//         `arn:aws:apigateway:${region}:lambda:path/2015-03-31/functions/${arn}/invocations`
//     ),
//     tags: {
//       Environment: stage
//     }
//   },
//   { dependsOn: [methodNode], provider }
// );

// // ------------------------------------------------------------------------------
// // Deploy RestApi
// // ------------------------------------------------------------------------------

// const deployment = new aws.apigateway.Deployment(
//   `${name}-api-deployment`,
//   {
//     restApi,
//     description: `${name} deployment`,
//     stageName: stage,
//     tags: {
//       Environment: stage
//     }
//   },
//   { dependsOn: [integrationGo, integrationNode], provider }
// );

// // ------------------------------------------------------------------------------
// // Create Lambda APIGATEWAY Permission
// // ------------------------------------------------------------------------------

// // Note: Lambda permission is only required when deploying to AWS cloud
// // Give permissions require( API Gateway to invoke the Lambda
// if (stage !== 'development') {
//   const invokePermissionGo = new aws.lambda.Permission(
//     `${name}-api-lambda-permission`,
//     {
//       action: 'lambda:invokeFunction',
//       function: lambdaGo,
//       principal: 'apigateway.amazonaws.com',
//       sourceArn: deployment.executionArn.apply(arn => `${arn}*/*/*`),
//       tags: {
//         Environment: stage
//       }
//     },
//     { provider }
//   );

//   const invokePermissionNode = new aws.lambda.Permission(
//     `${name}-api-lambda-permission`,
//     {
//       action: 'lambda:invokeFunction',
//       function: lambdaNode,
//       principal: 'apigateway.amazonaws.com',
//       sourceArn: deployment.executionArn.apply(arn => `${arn}*/*/*`),
//       tags: {
//         Environment: stage
//       }
//     },
//     { provider }
//   );
// }
// //------------------------------------------------------------------------------
// // Export RestAPI invoke urls
// //------------------------------------------------------------------------------

// let invokeURL;

// if (stage === 'development') {
//   invokeURL = restApi.id.apply(
//     id => `http://localhost:4567/restapis/${id}/${stage}/_user_request_/`
//   );
// } else {
//   invokeURL = deployment.invokeUrl.apply(url => `${url}/`);
// }

// exports.invokeURL = invokeURL;

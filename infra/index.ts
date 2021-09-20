import * as aws from '@pulumi/aws';
import * as awsx from '@pulumi/awsx';
import * as pulumi from '@pulumi/pulumi';
import { InfraConfig } from './resources/config';

//------------------------------------------------------------------------------
// Initialize Infra
//------------------------------------------------------------------------------
const config = new InfraConfig();

//------------------------------------------------------------------------------
// Setup Lambda IAM role
//------------------------------------------------------------------------------
const policy = <aws.iam.PolicyDocument>{
  Version: '2012-10-17',
  Statement: [
    {
      Action: 'sts:AssumeRole',
      Principal: {
        Service: 'lambda.amazonaws.com',
      },
      Effect: 'Allow',
      Sid: '',
    },
  ],
};

const role = new aws.iam.Role(`${config.prefix}-lambda-role`, {
  name: `${config.prefix}-lambda-role`,
  assumeRolePolicy: policy,
  tags: {
    Environment: config.env,
  }},
  {
    provider: config.provider,
});

//------------------------------------------------------------------------------
// Create IAM Role Policy
//------------------------------------------------------------------------------
let fullAccess = <aws.iam.RolePolicyAttachment>{};

if (config.stage !== 'local'){
  fullAccess = new aws.iam.RolePolicyAttachment(
    `${config.prefix}-lambda-fullAccess-policy`,
    {
      role,
      policyArn: aws.iam.ManagedPolicies.AWSLambdaFullAccess,
    },
    {
      provider: config.provider,
    }
  );
}


//------------------------------------------------------------------------------
// Create Lambda
//------------------------------------------------------------------------------

const getName = new aws.lambda.Function(
  `${config.prefix}-getName`,
  {
    name: `${config.prefix}-getName`,
    code: new pulumi.asset.FileArchive('../.build/getName'),
    handler: 'index.handler',
    runtime: aws.lambda.NodeJS12dXRuntime,
    timeout: 10,
    role: role.arn,
    publish: true,
    tags: {
      Environment: config.env,
    },
  },
  {
    provider: config.provider,
    dependsOn: fullAccess,
  }
);

const getAddress = new aws.lambda.Function(
  `${config.prefix}-getAddress`,
  {
    name: `${config.prefix}-getAddress`,
    code: new pulumi.asset.FileArchive('../.build/getAddress'),
    handler: 'index.handler',
    runtime: aws.lambda.NodeJS12dXRuntime,
    timeout: 10,
    role: role.arn,
    publish: true,
    tags: {
      Environment: config.env,
    },
  },
  {
    provider: config.provider,
    dependsOn: fullAccess,
  }
);

//------------------------------------------------------------------------------
// Setup APIGATEWAY
//------------------------------------------------------------------------------

// Note: Created this helper function to create all methods when specifying any. Localstack 
// constantly gave me "Unable to find integration for path" error when configuring methods
// as "ANY". This is a solution for testing it locally with the same prod configuration.
let genAnyLocal = (routes: awsx.apigateway.EventHandlerRoute[]): awsx.apigateway.Route[] => {
  let newRoutes = <awsx.apigateway.Route[]>[];
  let methods = <awsx.apigateway.Method[]>["GET", "PUT", "POST", "DELETE", "PATCH", "OPTIONS"]

  if (config.stage === 'local') {
    routes.forEach(route => {
      if (route.method == 'ANY') {
        methods.forEach(method => {
          newRoutes.push({
            ...route,
            method
          })
        });
      }
      else {
        newRoutes.push(route)
      }
    });
  }
  else {
    newRoutes = routes;
  }

  return newRoutes;
};

const restApi = new awsx.apigateway.API(
  `${config.prefix}-api`,
  {
    routes: genAnyLocal([
      {
        path: '/address',
        method: 'GET',
        eventHandler: getAddress,
      },
      {
        path: `/`,
        method: 'ANY',
        eventHandler: getName,
        apiKeyRequired: false,
      },
      {
        path: `/{proxy+}`,
        method: 'ANY',
        eventHandler: getName,
        apiKeyRequired: false,
      },
    ]),
    stageName: config.stage,
    apiKeySource: 'HEADER',
  },
  {
    provider: config.provider,
  }
);

let invokeURL;

if (config.stage === 'local') {
  invokeURL = pulumi.interpolate`http://localhost:4566/restapis/${restApi.restAPI.id}/${restApi.stage.stageName}/_user_request_/`;
} else {
  invokeURL = restApi.url.apply((url) => `${url}/`);
}

exports.invokeURL = invokeURL;
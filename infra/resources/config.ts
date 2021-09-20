import * as aws from '@pulumi/aws';
import * as pulumi from '@pulumi/pulumi';

export class InfraConfig {
  readonly stage: string;
  readonly appId: string;
  readonly prefix: string;
  readonly isProd: boolean;
  readonly env: string;
  readonly region: aws.Region;
  readonly provider: aws.Provider;

  constructor() {
    this.stage = pulumi.getStack();
    this.appId = pulumi.getProject();
    this.prefix = `${this.appId}-${this.stage}`;
    this.isProd = this.stage === 'prod';
    this.env = this.isProd ? 'production' : 'development';
    this.region = <aws.Region>'us-east-1';

    if (this.stage === 'local') {
      let localhost = 'localhost:4566';
      this.provider = new aws.Provider('localstack', {
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
        region: this.region,
        endpoints: [
          {
            apigateway: localhost,
            lambda: localhost,
            iam: localhost,
            sts: localhost,
            s3: localhost,
            sqs: localhost,
          },
        ],
      });
    } else {
      this.provider = new aws.Provider('aws', { region: this.region });
    }
  }
}

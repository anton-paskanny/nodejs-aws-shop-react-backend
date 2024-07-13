import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { BasicAuthorizerLambda } from '../lambdas/basicAuthorizerLambda';
import 'dotenv/config'

export class AuthorizationServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const login = "anton-paskanny";

    console.log('process.env[login] - ', process.env[login]);

    const environment = {
      SECRET_KEY: process.env[login]
    };

    new BasicAuthorizerLambda(
      this,
      'BasicAuthorizationLambda',
      environment
    );
  }
}

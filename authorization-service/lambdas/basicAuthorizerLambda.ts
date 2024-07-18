import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';

export class BasicAuthorizerLambda extends Construct {
    public readonly lambdaFunction: lambda.Function;

    constructor(
        scope: Construct,
        id: string,
        environment: any
    ) {
        super(scope, id);

        this.lambdaFunction = new lambda.Function(
            this,
            'BasicAuthorizerHandler',
            {
                runtime: lambda.Runtime.NODEJS_20_X,
                code: lambda.Code.fromAsset('handlers/auth'),
                handler: 'basicAuthorizer.handler',
                functionName: 'AuthFunction',
                environment,
            }
        );
    }
}

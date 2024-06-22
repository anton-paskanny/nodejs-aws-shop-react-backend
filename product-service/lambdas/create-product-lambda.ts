import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
import { LambdaEnvironmentType } from '../types/environment';

export class CreateProductLambda extends Construct {
    public readonly lambdaFunction: lambda.Function;

    constructor(
        scope: Construct,
        id: string,
        environment: LambdaEnvironmentType
    ) {
        super(scope, id);

        this.lambdaFunction = new lambda.Function(
            this,
            'CreateProductHandler',
            {
                runtime: lambda.Runtime.NODEJS_20_X,
                code: lambda.Code.fromAsset('handlers'),
                handler: 'createProduct.handler',
                environment,
            }
        );
    }
}

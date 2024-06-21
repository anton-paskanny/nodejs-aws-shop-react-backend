import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';

export class GetProductsByIdLambda extends Construct {
    public readonly lambdaFunction: lambda.Function;

    constructor(scope: Construct, id: string) {
        super(scope, id);

        this.lambdaFunction = new lambda.Function(
            this,
            'GetProductsByIdHandler',
            {
                runtime: lambda.Runtime.NODEJS_20_X,
                code: lambda.Code.fromAsset('handlers'),
                handler: 'getProductsById.handler',
            }
        );
    }
}

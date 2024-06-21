import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';

export class GetProductsListLambda extends Construct {
    public readonly lambdaFunction: lambda.Function;

    constructor(scope: Construct, id: string) {
        super(scope, id);

        this.lambdaFunction = new lambda.Function(
            this,
            'GetProductsListHandler',
            {
                runtime: lambda.Runtime.NODEJS_20_X,
                code: lambda.Code.fromAsset('handlers'),
                handler: 'getProductsList.handler',
            }
        );
    }
}

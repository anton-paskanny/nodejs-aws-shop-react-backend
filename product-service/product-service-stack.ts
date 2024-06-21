import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { ProductApi } from './product-service-api-gateway';
import { GetProductsListLambda } from './lambdas/get-products-list-lambda';
import { GetProductsByIdLambda } from './lambdas/get-products-by-id-lambda';

export class ProductServiceStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        const getProductsListLambda = new GetProductsListLambda(
            this,
            'GetProductsListLambda'
        );

        const getProductsByIdLambda = new GetProductsByIdLambda(
            this,
            'GetProductsByIdLambda'
        );

        new ProductApi(this, 'ProductApi', {
            getProductsListLambda: getProductsListLambda.lambdaFunction,
            getProductsByIdLambda: getProductsByIdLambda.lambdaFunction,
        });
    }
}

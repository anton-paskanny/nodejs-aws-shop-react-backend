import * as cdk from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';

interface ProductApiProps extends cdk.StackProps {
    getProductsListLambda: lambda.Function;
    getProductsByIdLambda: lambda.Function;
    createProductLambda: lambda.Function;
}

export class ProductApi extends Construct {
    constructor(scope: Construct, id: string, props: ProductApiProps) {
        super(scope, id);

        const api = new apigateway.RestApi(this, 'ProductServiceApi', {
            restApiName: 'Product Service',
            description: 'This service is responsible for products.',
            defaultCorsPreflightOptions: {
                allowOrigins: apigateway.Cors.ALL_ORIGINS,
                allowMethods: apigateway.Cors.ALL_METHODS,
            },
        });

        const products = api.root.addResource('products');

        const getProductsListIntegration = new apigateway.LambdaIntegration(
            props.getProductsListLambda
        );
        products.addMethod('GET', getProductsListIntegration);

        const createProductIntegration = new apigateway.LambdaIntegration(
            props.createProductLambda
        );
        products.addMethod('POST', createProductIntegration);

        const singleProduct = products.addResource('{productId}');

        const getProductsByIdIntegration = new apigateway.LambdaIntegration(
            props.getProductsByIdLambda
        );
        singleProduct.addMethod('GET', getProductsByIdIntegration);
    }
}

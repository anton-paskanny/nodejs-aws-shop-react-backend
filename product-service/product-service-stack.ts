import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';
import { ProductApi } from './product-service-api-gateway';
import { GetProductsListLambda } from './lambdas/get-products-list-lambda';
import { GetProductsByIdLambda } from './lambdas/get-products-by-id-lambda';
import { CreateProductLambda } from './lambdas/create-product-lambda';
import {
    PRODUCT_SERVICE_AWS_REGION,
    PRODUCT_SERVICE_TABLES,
} from './utils/constants';

export class ProductServiceStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        const productsTable = dynamodb.Table.fromTableName(
            this,
            'ProductsTable',
            PRODUCT_SERVICE_TABLES.products
        );
        const stocksTable = dynamodb.Table.fromTableName(
            this,
            'StocksTable',
            PRODUCT_SERVICE_TABLES.stocks
        );

        const environment = {
            PRODUCTS_TABLE_NAME: PRODUCT_SERVICE_TABLES.products,
            STOCKS_TABLE_NAME: PRODUCT_SERVICE_TABLES.stocks,
            AWS_REGION: PRODUCT_SERVICE_AWS_REGION,
        };

        const getProductsListLambda = new GetProductsListLambda(
            this,
            'GetProductsListLambda',
            environment
        );

        const getProductsByIdLambda = new GetProductsByIdLambda(
            this,
            'GetProductsByIdLambda',
            environment
        );

        const createProductLambda = new CreateProductLambda(
            this,
            'CreateProductLambda',
            environment
        );

        new ProductApi(this, 'ProductApi', {
            getProductsListLambda: getProductsListLambda.lambdaFunction,
            getProductsByIdLambda: getProductsByIdLambda.lambdaFunction,
            createProductLambda: createProductLambda.lambdaFunction,
        });

        productsTable.grantReadWriteData(getProductsListLambda.lambdaFunction);
        productsTable.grantReadWriteData(getProductsByIdLambda.lambdaFunction);
        productsTable.grantReadWriteData(createProductLambda.lambdaFunction);

        stocksTable.grantReadWriteData(getProductsListLambda.lambdaFunction);
        stocksTable.grantReadWriteData(getProductsByIdLambda.lambdaFunction);
        stocksTable.grantReadWriteData(createProductLambda.lambdaFunction);
    }
}

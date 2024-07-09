import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as sns_subscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import * as lambdaEventSources from 'aws-cdk-lib/aws-lambda-event-sources';
import { Construct } from 'constructs';
import { ProductApi } from '../api/product-service-api-gateway';
import { GetProductsListLambda } from '../lambdas/get-products-list-lambda';
import { GetProductsByIdLambda } from '../lambdas/get-products-by-id-lambda';
import { CreateProductLambda } from '../lambdas/create-product-lambda';
import {
    PRODUCT_SERVICE_TABLES,
    PRODUCT_PRICE_LIMIT,
} from '../utils/constants';
import { CatalogBatchProcessLambda } from '../lambdas/catalog-batch-process-lambda';

export class ProductServiceStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        const createProductTopic = new sns.Topic(this, 'CreateProductTopic', {
            displayName: 'Product successfully created',
        });

        createProductTopic.addSubscription(
            new sns_subscriptions.EmailSubscription('anton.paskanny@gmail.com')
        );

        createProductTopic.addSubscription(
            new sns_subscriptions.EmailSubscription(
                'wewerebornforthis99@gmail.com',
                {
                    filterPolicy: {
                        price: sns.SubscriptionFilter.numericFilter({
                            greaterThan: PRODUCT_PRICE_LIMIT,
                        }),
                    },
                }
            )
        );

        const catalogItemsQueue = new sqs.Queue(this, 'CatalogItemsQueue', {
            queueName: 'catalogItemsQueue',
        });

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
            SNS_CREATE_TOPIC_ARN: createProductTopic.topicArn,
            SQS_URL: catalogItemsQueue.queueUrl,
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

        const catalogBatchProcessLambda = new CatalogBatchProcessLambda(
            this,
            'CatalogBatchProcessLambda',
            environment
        );

        productsTable.grantReadWriteData(
            catalogBatchProcessLambda.lambdaFunction
        );
        stocksTable.grantReadWriteData(
            catalogBatchProcessLambda.lambdaFunction
        );

        const eventSource = new lambdaEventSources.SqsEventSource(
            catalogItemsQueue,
            {
                batchSize: 5,
            }
        );

        catalogBatchProcessLambda.lambdaFunction.addEventSource(eventSource);

        new ProductApi(this, 'ProductApi', {
            getProductsListLambda: getProductsListLambda.lambdaFunction,
            getProductsByIdLambda: getProductsByIdLambda.lambdaFunction,
            createProductLambda: createProductLambda.lambdaFunction,
        });

        productsTable.grantReadWriteData(getProductsListLambda.lambdaFunction);
        productsTable.grantReadWriteData(getProductsByIdLambda.lambdaFunction);
        productsTable.grantReadWriteData(createProductLambda.lambdaFunction);
        productsTable.grantReadWriteData(
            catalogBatchProcessLambda.lambdaFunction
        );

        stocksTable.grantReadWriteData(getProductsListLambda.lambdaFunction);
        stocksTable.grantReadWriteData(getProductsByIdLambda.lambdaFunction);
        stocksTable.grantReadWriteData(createProductLambda.lambdaFunction);
        stocksTable.grantReadWriteData(
            catalogBatchProcessLambda.lambdaFunction
        );

        createProductTopic.grantPublish(
            catalogBatchProcessLambda.lambdaFunction
        );

        new cdk.CfnOutput(this, 'CatalogItemsQueueArn', {
            value: catalogItemsQueue.queueArn,
            exportName: 'CatalogItemsQueueArn',
        });
    }
}

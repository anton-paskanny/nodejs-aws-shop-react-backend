import {
    DynamoDBClient,
    BatchWriteItemCommand,
} from '@aws-sdk/client-dynamodb';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import { randomUUID } from 'node:crypto';
import { SQSEvent, SQSHandler } from 'aws-lambda';

const dynamoClient = new DynamoDBClient({});
const snsClient = new SNSClient({});

const {
    PRODUCTS_TABLE_NAME,
    STOCKS_TABLE_NAME,
    SNS_CREATE_TOPIC_ARN,
    SNS_PRICE_LIMIT_TOPIC_ARN,
} = process.env;

export const handler: SQSHandler = async (event: SQSEvent) => {
    console.log('[catalogBatchProcess] event: ', event);

    const productPutRequests: any[] = [];
    const stockPutRequests: any[] = [];

    const records = event.Records.map((record) => {
        const item = JSON.parse(record.body);

        console.log('[catalogBatchProcess] record body: ', item);

        const id = randomUUID();

        console.log('[catalogBatchProcess] randomUUID: ', id);

        item.id = id;

        const productPutRequest = {
            PutRequest: {
                Item: {
                    id: { S: item.id },
                    title: { S: item.title },
                    description: { S: item.description },
                    price: { N: item.price?.toString() },
                },
            },
        };

        const stockPutRequest = {
            PutRequest: {
                Item: {
                    product_id: { S: item.id },
                    count: { N: item.count?.toString() },
                },
            },
        };

        productPutRequests.push(productPutRequest);
        stockPutRequests.push(stockPutRequest);

        return item;
    });

    const productParams = {
        RequestItems: {
            [PRODUCTS_TABLE_NAME as string]: productPutRequests,
        },
    };

    const stockParams = {
        RequestItems: {
            [STOCKS_TABLE_NAME as string]: stockPutRequests,
        },
    };

    console.log('[catalogBatchProcess] productParams: ', productParams);
    console.log('[catalogBatchProcess] stockParams: ', stockParams);

    try {
        const productCommand = new BatchWriteItemCommand(productParams);
        await dynamoClient.send(productCommand);

        const stockCommand = new BatchWriteItemCommand(stockParams);
        await dynamoClient.send(stockCommand);

        console.log('[catalogBatchProcess] Batch write successful');

        console.log(
            '[catalogBatchProcess] SNS_CREATE_TOPIC_ARN: ',
            SNS_CREATE_TOPIC_ARN
        );

        const message = {
            Message: JSON.stringify({
                default: 'Products successfully created',
                products: records,
            }),
            TopicArn: SNS_CREATE_TOPIC_ARN,
            MessageStructure: 'json',
        };

        console.log('[catalogBatchProcess] SNS message: ', message);

        const publishCommand = new PublishCommand(message);
        await snsClient.send(publishCommand);
        console.log(
            '[catalogBatchProcess] SNS notification sent (products created)'
        );

        console.log(
            '[catalogBatchProcess] SNS_CREATE_TOPIC_ARN: ',
            SNS_PRICE_LIMIT_TOPIC_ARN
        );

        for (const product of records) {
            if (product.price > 100) {
                const message = {
                    Message: JSON.stringify({
                        default: 'Products has a price above limit',
                        product: product,
                    }),
                    TopicArn: SNS_PRICE_LIMIT_TOPIC_ARN,
                    MessageAttributes: {
                        price: {
                            DataType: 'Number',
                            StringValue: product.price.toString(),
                        },
                    },
                };

                const publishCommand = new PublishCommand(message);
                await snsClient.send(publishCommand);
                console.log(
                    '[catalogBatchProcess] SNS price limit product is published successfully:',
                    product
                );
            }
        }
    } catch (error) {
        console.error('[catalogBatchProcess] Error writing to DynamoDB', error);
    }
};

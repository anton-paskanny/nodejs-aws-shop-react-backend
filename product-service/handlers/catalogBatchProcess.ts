import {
    DynamoDBClient,
    BatchWriteItemCommand,
    GetItemCommand,
} from '@aws-sdk/client-dynamodb';
import { randomUUID } from 'node:crypto';
import { SQSEvent, SQSHandler } from 'aws-lambda';
import { sendSnsMessage } from '../utils/sns-helpers';
import { PRODUCT_PRICE_LIMIT } from '../utils/constants';

const dynamoClient = new DynamoDBClient({});

const { PRODUCTS_TABLE_NAME, STOCKS_TABLE_NAME, SNS_CREATE_TOPIC_ARN } =
    process.env;

export const handler: SQSHandler = async (event: SQSEvent) => {
    console.log('[catalogBatchProcess] event: ', event);

    const productPutRequests: any[] = [];
    const stockPutRequests: any[] = [];

    const records = await Promise.all(
        event.Records.map(async (record) => {
            const item = JSON.parse(record.body);

            console.log('[catalogBatchProcess] record body: ', item);

            // Check if the product with the same title already exists
            const existingProduct = await dynamoClient.send(
                new GetItemCommand({
                    TableName: PRODUCTS_TABLE_NAME,
                    Key: { title: { S: item.title } },
                })
            );

            if (existingProduct.Item) {
                console.log(
                    '[catalogBatchProcess] Product with such title already exists: ',
                    item.title
                );
                item.id = existingProduct.Item.id.S;
            } else {
                const id = randomUUID();
                console.log('[catalogBatchProcess] randomUUID: ', id);
                item.id = id;
            }

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
        })
    );

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
    } catch (error) {
        console.error('[catalogBatchProcess] Error writing to DynamoDB', error);
        return;
    }

    console.log('[catalogBatchProcess] Send sns messages block');

    console.log(
        '[catalogBatchProcess] SNS_CREATE_TOPIC_ARN: ',
        SNS_CREATE_TOPIC_ARN
    );

    console.log('[catalogBatchProcess] Records array: ', records);

    const snsMessageData = {
        messageTitle: `The following products were successfully created`,
        topicArn: SNS_CREATE_TOPIC_ARN || '',
        subject: 'Products Creation Notification',
        products: records,
    };

    console.log(
        '[catalogBatchProcess] SNS creation products message data: ',
        snsMessageData
    );

    try {
        await sendSnsMessage(snsMessageData);
        console.log(
            '[catalogBatchProcess] SNS creation product message sent successfully'
        );
    } catch (error) {
        console.error(
            '[catalogBatchProcess] Error sending SNS creation product message:',
            error
        );
        return;
    }

    console.log(
        '[catalogBatchProcess] SNS creation products message sent successfully: '
    );

    let priceLimitProducts = [];

    for (const product of records) {
        if (product.price > PRODUCT_PRICE_LIMIT) {
            priceLimitProducts.push(product);
        }
    }

    if (priceLimitProducts.length > 0) {
        console.log(
            '[catalogBatchProcess] Products with price limit: ',
            priceLimitProducts
        );

        const snsPriceLimitMessageData = {
            messageTitle: `Products with price above limit (${PRODUCT_PRICE_LIMIT})`,
            topicArn: SNS_CREATE_TOPIC_ARN || '',
            subject: 'Price Limit Exceeded Notification',
            products: priceLimitProducts,
            attributes: {
                price: {
                    DataType: 'Number',
                    StringValue: Math.max(
                        ...priceLimitProducts.map((product) => product.price)
                    ).toString(),
                },
            },
        };

        try {
            await sendSnsMessage(snsPriceLimitMessageData);
            console.log(
                '[catalogBatchProcess] SNS price limit products were published successfully:',
                priceLimitProducts
            );
        } catch (error) {
            console.error(
                '[catalogBatchProcess] Error sending SNS price limit products message:',
                error
            );
        }
    }
};

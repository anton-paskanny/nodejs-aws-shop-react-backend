import { randomUUID } from 'crypto';
import * as AWS from 'aws-sdk';
import { DynamoDB } from 'aws-sdk';
import { APIGatewayEvent, APIGatewayProxyResult } from 'aws-lambda';
import { headers } from './headers';

export const handler = async (
    event: APIGatewayEvent
): Promise<APIGatewayProxyResult> => {
    console.log('[createProduct] Incoming request:', event);

    const dynamoDB = new AWS.DynamoDB.DocumentClient();

    const requestBody = JSON.parse(event.body || '{}');

    const productTitle = requestBody.title;
    const productPrice = requestBody.price;
    const productDescrition = requestBody.description;
    const initialStockCount = requestBody.count;

    const invalidBodyFields = [];

    if (!productTitle) invalidBodyFields.push('title');
    if (!productDescrition) invalidBodyFields.push('description');
    if (!productPrice) invalidBodyFields.push('price');
    if (initialStockCount === undefined) invalidBodyFields.push('count');

    if (invalidBodyFields.length) {
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({
                message: 'Missing required fields',
                data: invalidBodyFields,
            }),
        };
    }

    // Check if product with such title was already created
    const params: AWS.DynamoDB.DocumentClient.QueryInput = {
        TableName: process.env.PRODUCTS_TABLE_NAME!,
        KeyConditionExpression: 'title = :title',
        ExpressionAttributeValues: {
            ':title': productTitle,
        },
        Limit: 1,
    };

    let existingProduct;

    try {
        const data = await new AWS.DynamoDB.DocumentClient()
            .query(params)
            .promise();
        existingProduct =
            data.Items && data.Items.length > 0 ? data.Items[0] : null;
    } catch (error) {
        console.error(
            '[createProduct] Error retrieving product by title:',
            error
        );
        throw error;
    }

    if (existingProduct) {
        return {
            statusCode: 409,
            headers,
            body: JSON.stringify({
                message: 'Product with the same title already exists',
                productId: existingProduct.id,
            }),
        };
    }

    const productId = randomUUID();

    const transactionParams: DynamoDB.TransactWriteItemsInput = {
        TransactItems: [
            {
                Put: {
                    TableName: process.env.PRODUCTS_TABLE_NAME!,
                    Item: {
                        id: { S: productId },
                        title: productTitle,
                        price: productPrice,
                    },
                    ConditionExpression: 'attribute_not_exists(productId)',
                },
            },
            {
                Put: {
                    TableName: process.env.STOCKS_TABLE_NAME!,
                    Item: {
                        product_id: { S: productId },
                        count: initialStockCount,
                    },
                    ConditionExpression: 'attribute_not_exists(product_id)',
                },
            },
        ],
    };

    try {
        await dynamoDB.transactWrite(transactionParams).promise();

        return {
            statusCode: 201,
            headers,
            body: JSON.stringify({
                message: 'Product and stock created successfully',
                productId,
                count: initialStockCount,
            }),
        };
    } catch (error) {
        console.error(
            '[createProduct] Error creating product and stock:',
            error
        );

        return {
            statusCode: 500,
            body: JSON.stringify({
                message: 'Error creating product and stock',
                data: error,
            }),
        };
    }
};

import { randomUUID } from 'crypto';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
    DynamoDBDocumentClient,
    TransactWriteCommand,
    ScanCommand,
} from '@aws-sdk/lib-dynamodb';
import { APIGatewayEvent, APIGatewayProxyResult } from 'aws-lambda';
import { headers } from './headers';

export const handler = async (
    event: APIGatewayEvent
): Promise<APIGatewayProxyResult> => {
    console.log('[createProduct] Incoming request:', event);

    const dynamoDBClient = new DynamoDBClient();
    const dynamoDB = DynamoDBDocumentClient.from(dynamoDBClient);

    const requestBody = JSON.parse(event.body || '{}');

    console.log('[createProduct] Request body:', requestBody);

    const productTitle = requestBody.title;
    const productPrice = requestBody.price;
    const productDescription = requestBody.description;
    const initialStockCount = requestBody.count;

    const invalidBodyFields = [];

    if (!productTitle) invalidBodyFields.push('title');
    if (!productDescription) invalidBodyFields.push('description');
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
    const scanParams: any = {
        TableName: process.env.PRODUCTS_TABLE_NAME!,
        FilterExpression: 'title = :title',
        ExpressionAttributeValues: {
            ':title': productTitle,
        },
        Limit: 1,
    };

    let existingProduct;

    try {
        const data = await dynamoDB.send(new ScanCommand(scanParams));
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

    const transactionParams: any = {
        TransactItems: [
            {
                Put: {
                    TableName: process.env.PRODUCTS_TABLE_NAME!,
                    Item: {
                        id: productId,
                        title: productTitle,
                        description: productDescription,
                        price: productPrice,
                    },
                    ConditionExpression: 'attribute_not_exists(id)',
                },
            },
            {
                Put: {
                    TableName: process.env.STOCKS_TABLE_NAME!,
                    Item: {
                        product_id: productId,
                        count: initialStockCount,
                    },
                    ConditionExpression: 'attribute_not_exists(product_id)',
                },
            },
        ],
    };

    try {
        await dynamoDB.send(new TransactWriteCommand(transactionParams));

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

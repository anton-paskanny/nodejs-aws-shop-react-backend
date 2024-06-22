import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';
import { headers } from './headers';

export const handler = async (
    event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
    console.log('[getProductsById] Incoming request:', event);

    const client = new DynamoDBClient({ region: process.env.AWS_REGION });
    const ddbDocClient = DynamoDBDocumentClient.from(client);

    const productsTable = process.env.PRODUCTS_TABLE_NAME;
    const stocksTable = process.env.STOCKS_TABLE_NAME;

    if (!productsTable || !stocksTable) {
        throw new Error('No tables defined in the environment variables');
    }

    try {
        const productId = event.pathParameters?.productId;

        if (!productId) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({
                    error: 'ProductId not found in the request parameters',
                }),
            };
        }

        const getProductParams = {
            TableName: productsTable,
            Key: {
                id: productId,
            },
        };
        const productData = await ddbDocClient.send(
            new GetCommand(getProductParams)
        );
        const product = productData.Item;

        if (!product) {
            return {
                statusCode: 404,
                headers,
                body: JSON.stringify({
                    error: `Product with ID ${productId} not found`,
                }),
            };
        }

        const getStockParams = {
            TableName: stocksTable,
            Key: {
                product_id: productId,
            },
        };
        const stockData = await ddbDocClient.send(
            new GetCommand(getStockParams)
        );
        const count = stockData.Item ? stockData.Item.count : 0;

        const fullProduct = {
            ...product,
            count: count,
        };

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(fullProduct),
        };
    } catch (error: any) {
        console.error('[getProductsById] Error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                message: 'Internal Server Error',
                data: error,
            }),
        };
    }
};

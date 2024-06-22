import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';

import { headers } from './headers';

export const handler = async (
    event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
    console.log('[getProductsList] Incoming request:', event);

    const client = new DynamoDBClient({ region: process.env.AWS_REGION });
    const ddbDocClient = DynamoDBDocumentClient.from(client);

    const productsTable = process.env.PRODUCTS_TABLE_NAME;
    const stocksTable = process.env.STOCKS_TABLE_NAME;

    if (!productsTable || !stocksTable) {
        throw new Error('No tables defined in the environment variables');
    }

    try {
        const productsData = await ddbDocClient.send(
            new ScanCommand({ TableName: productsTable })
        );
        const products = productsData.Items;

        const stocksData = await ddbDocClient.send(
            new ScanCommand({ TableName: stocksTable })
        );
        const stocks = stocksData.Items;

        if (!products || !stocks) {
            throw new Error(
                'Error fetching data from tables - either no stocks or products'
            );
        }

        const fullProducts = products.map((product) => {
            const stock = stocks.find(
                (stockItem) => stockItem.product_id === product.id
            );
            return {
                ...product,
                count: stock ? stock.count : 0,
            };
        });

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(fullProducts),
        };
    } catch (error: any) {
        console.error('[getProductsList] Error:', error);
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

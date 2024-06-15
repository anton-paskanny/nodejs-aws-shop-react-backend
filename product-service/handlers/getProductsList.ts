import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

import { productsListMock } from './products';
import { headers } from './headers';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(productsListMock),
        };
    } catch (error: any) {
        console.error('[getProductsList] Error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                message: 'Internal Server Error',
                data: error
            }),
        };
    }
};

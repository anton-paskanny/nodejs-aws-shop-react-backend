import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

import { productsListMock } from './products';
import { headers } from './headers';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
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

        const convertedProductId = Number.parseInt(productId);

        const product = productsListMock.find((item) => item.id === convertedProductId);

        if (!product) {
            return {
                statusCode: 404,
                headers,
                body: JSON.stringify({
                    error: `Product with ${productId} not found`,
                }),
            };
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(product),
        };
    } catch (error: any) {
        console.error('[getProductsById] Error:', error);
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

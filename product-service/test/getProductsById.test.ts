import { handler } from '../handlers/getProductsById';
import { APIGatewayProxyEvent } from 'aws-lambda';
import { productsListMock } from '../mocks/products';

describe('getProductsById Lambda Handler', () => {
    it('should return product details with status code 200', async () => {
        const mockEvent = {
            pathParameters: {
                productId: 1,
            },
        } as unknown as APIGatewayProxyEvent;

        const result = await handler(mockEvent);

        expect(result.statusCode).toBe(200);
        expect(JSON.parse(result.body)).toEqual(productsListMock[0]);
    });

    it('should handle 404 error', async () => {
        const mockEvent = {
            pathParameters: {
                productId: 999,
            },
        } as unknown as APIGatewayProxyEvent;

        const result = await handler(mockEvent);

        expect(result.statusCode).toBe(404);
        expect(JSON.parse(result.body)).toEqual({
            error: 'Product with 999 not found',
        });
    });

    it('should handle 400 error - no productID in request', async () => {
        const mockEvent = {
            pathParameters: {},
        } as unknown as APIGatewayProxyEvent;

        const result = await handler(mockEvent);

        expect(result.statusCode).toBe(400);
        expect(JSON.parse(result.body)).toEqual({
            error: 'ProductId not found in the request parameters',
        });
    });
});

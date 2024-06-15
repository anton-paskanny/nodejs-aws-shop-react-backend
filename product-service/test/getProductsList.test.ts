import { handler } from '../handlers/getProductsList';
import { APIGatewayProxyEvent } from 'aws-lambda';
import { productsListMock } from '../handlers/products';

describe('getProductsList Lambda Handler', () => {
    it('should return list of products with status code 200', async () => {
        const mockEvent = {} as APIGatewayProxyEvent;

        const result = await handler(mockEvent);

        expect(result.statusCode).toBe(200);
        expect(JSON.parse(result.body)).toEqual(productsListMock);
    });
});

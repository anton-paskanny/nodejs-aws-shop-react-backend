import { APIGatewayProxyEvent } from 'aws-lambda';
import { handler } from '../handlers/getProductsById';
import { productsListMock } from '../mocks/products';
import { stocksListMock } from '../mocks/stocks';

jest.mock('@aws-sdk/client-dynamodb', () => {
    return {
        DynamoDBClient: jest.fn().mockImplementation(() => {
            return {};
        }),
    };
});

let mockSend = jest.fn();

jest.mock('@aws-sdk/lib-dynamodb', () => {
    return {
        DynamoDBDocumentClient: {
            from: jest.fn().mockImplementation(() => {
                return {
                    send: mockSend,
                };
            }),
        },
        GetCommand: jest.fn(),
    };
});

describe('getProductsById Lambda Handler', () => {
    beforeEach(() => {
        process.env.AWS_REGION = 'us-east-1';
        process.env.PRODUCTS_TABLE_NAME = 'products';
        process.env.STOCKS_TABLE_NAME = 'stocks';
        mockSend.mockClear();
    });

    afterEach(() => {
        jest.clearAllMocks();
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

    it('should return product details with status code 200', async () => {
        const mockEvent = {
            pathParameters: {
                productId: '00c843cf-599e-4dd6-92f0-6689a0510296',
            },
        } as unknown as APIGatewayProxyEvent;

        mockSend
            .mockResolvedValueOnce({ Item: productsListMock[0] })
            .mockResolvedValueOnce({ Item: stocksListMock[0] });

        const result = await handler(mockEvent);

        expect(result.statusCode).toBe(200);
        expect(JSON.parse(result.body)).toEqual({
            ...productsListMock[0],
            count: stocksListMock[0].count,
        });
    });

    it('should handle 404 error', async () => {
        const mockEvent = {
            pathParameters: {
                productId: '999',
            },
        } as unknown as APIGatewayProxyEvent;

        mockSend.mockResolvedValueOnce({ Item: null });

        const result = await handler(mockEvent);

        expect(result.statusCode).toBe(404);
        expect(JSON.parse(result.body)).toEqual({
            error: 'Product with ID 999 not found',
        });
    });

    it('should return error with status code 500 when there is an exception', async () => {
        const mockEvent = {
            pathParameters: {
                productId: '00c843cf-599e-4dd6-92f0-6689a0510296',
            },
        } as unknown as APIGatewayProxyEvent;

        mockSend.mockRejectedValueOnce(new Error('DynamoDB error Jesus'));

        const result = await handler(mockEvent);

        expect(result.statusCode).toBe(500);
        expect(JSON.parse(result.body).message).toBe('Internal Server Error');
    });
});

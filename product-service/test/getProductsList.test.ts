import { handler } from '../handlers/getProductsList';
import { APIGatewayProxyEvent } from 'aws-lambda';
import { productsListMock } from '../mocks/products';
import { stocksListMock } from '../mocks/stocks';

jest.mock('@aws-sdk/client-dynamodb', () => {
    return {
        DynamoDBClient: jest.fn().mockImplementation(() => {
            return {};
        }),
    };
});

const mockSend = jest.fn();

jest.mock('@aws-sdk/lib-dynamodb', () => {
    return {
        DynamoDBDocumentClient: {
            from: jest.fn().mockImplementation(() => {
                return {
                    send: mockSend,
                };
            }),
        },
        ScanCommand: jest.fn(),
    };
});

describe('getProductsList Lambda Handler', () => {
    beforeEach(() => {
        process.env.AWS_REGION = 'us-east-1';
        process.env.PRODUCTS_TABLE_NAME = 'products';
        process.env.STOCKS_TABLE_NAME = 'stocks';
        mockSend.mockClear();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should return list of products with status code 200', async () => {
        const mockEvent = {} as APIGatewayProxyEvent;

        mockSend
            .mockResolvedValueOnce({ Items: productsListMock })
            .mockResolvedValueOnce({ Items: stocksListMock });

        const result = await handler(mockEvent);

        expect(result.statusCode).toBe(200);
        expect(JSON.parse(result.body)).toEqual(
            productsListMock.map((product) => ({
                ...product,
                count:
                    stocksListMock.find(
                        (stock) => stock.product_id === product.id
                    )?.count || 0,
            }))
        );
    });

    it('should return error with status code 500 when there is an exception', async () => {
        const mockEvent = {} as APIGatewayProxyEvent;

        mockSend.mockRejectedValueOnce(new Error('DynamoDB error'));

        const result = await handler(mockEvent);

        expect(result.statusCode).toBe(500);
        expect(JSON.parse(result.body).message).toBe('Internal Server Error');
    });
});

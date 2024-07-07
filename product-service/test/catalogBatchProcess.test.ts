import { SQSEvent } from 'aws-lambda';
import { mockDynamoDBClient, mockSNSClient } from '../mocks/aws-sdk';
import { handler } from '../handlers/catalogBatchProcess';

describe('catalogBatchProcess handler', () => {
    const mockEvent: SQSEvent = {
        Records: [
            //@ts-ignore
            {
                body: JSON.stringify({
                    id: '1',
                    title: 'Product One',
                    description: 'Description of product one',
                    price: 99.99,
                    count: 10,
                }),
            },
            //@ts-ignore
            {
                body: JSON.stringify({
                    id: '2',
                    title: 'Product Two',
                    description: 'Description of product two',
                    price: 199.99,
                    count: 5,
                }),
            },
        ],
    };

    beforeEach(() => {
        jest.clearAllMocks();
        jest.spyOn(console, 'error').mockImplementation(() => {});

        process.env.PRODUCTS_TABLE_NAME = 'mock-products-table';
        process.env.STOCKS_TABLE_NAME = 'mock-stocks-table';
        process.env.SNS_CREATE_TOPIC_ARN = 'mock-create-topic-arn';
        process.env.SNS_PRICE_LIMIT_TOPIC_ARN = 'mock-price-limit-topic-arn';
    });

    it('should write products to DynamoDB and publish SNS notifications', async () => {
        //@ts-ignore
        await handler(mockEvent);

        expect(mockDynamoDBClient.send).toHaveBeenCalledTimes(2);

        // Check SNS publish calls for products created
        expect(mockSNSClient.send).toHaveBeenNthCalledWith(
            1,
            expect.objectContaining({
                Message: expect.stringContaining(
                    'Products successfully created'
                ),
            })
        );

        expect(mockSNSClient.send).toHaveBeenNthCalledWith(
            2,
            expect.objectContaining({
                Message: expect.stringContaining(
                    'Products has a price above limit'
                ),
            })
        );
    });

    it('should handle errors when writing to DynamoDB', async () => {
        mockDynamoDBClient.send.mockRejectedValueOnce(
            new Error('DynamoDB write error')
        );

        //@ts-ignore
        await handler(mockEvent);

        expect(console.error).toHaveBeenCalledTimes(1);
    });
});

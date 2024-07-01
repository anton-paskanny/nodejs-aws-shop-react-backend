import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { mockClient } from 'aws-sdk-client-mock';
import { handler } from '../handlers/importProductsFile.js';
import { headers } from '../handlers/headers';

jest.mock('@aws-sdk/s3-request-presigner', () => ({
    getSignedUrl: jest.fn(),
}));

const s3Mock = mockClient(S3Client);

describe('importProductsFile', () => {
    beforeEach(() => {
        s3Mock.reset();
    });

    it('should return a signed URL when file name is provided', async () => {
        process.env.BUCKET_NAME = 'products-csv-bucket';

        const mockUrl = 'https://my-awesome-url.com';

        (getSignedUrl as jest.Mock).mockResolvedValue(mockUrl);

        const event = {
            queryStringParameters: { name: 'listOfProducts.csv' },
        } as unknown as APIGatewayProxyEvent;

        const result: APIGatewayProxyResult = await handler(event);

        expect(result.statusCode).toBe(200);
        expect(result.headers).toBe(headers);
        expect(result.body).toBe(mockUrl);
        expect(getSignedUrl).toHaveBeenCalledWith(
            expect.any(S3Client),
            expect.any(PutObjectCommand),
            { expiresIn: 300 }
        );
    });

    it('should return a 400 error when file name is not provided', async () => {
        const event = {
            queryStringParameters: {},
        } as unknown as APIGatewayProxyEvent;

        const result: APIGatewayProxyResult = await handler(event);

        expect(result.statusCode).toBe(400);
        expect(result.body).toBe(
            JSON.stringify({
                message: 'Missing file name in query string parameters',
            })
        );
    });
});

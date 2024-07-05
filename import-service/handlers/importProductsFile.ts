import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { headers } from './headers';

const s3Client = new S3Client();

export const handler = async (
    event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
    console.log('[importProductsFile] Incoming request:', event);

    const bucketName = process.env.BUCKET_NAME;
    const fileName = event.queryStringParameters?.name;

    console.log('[importProductsFile] bucketName:', bucketName);

    console.log('[importProductsFile] fileName:', fileName);

    if (!fileName) {
        return {
            statusCode: 400,
            body: JSON.stringify({
                message: 'Missing file name in query string parameters',
            }),
        };
    }

    const key = `uploaded/${fileName}`;
    const signedUrlExpireSeconds = 60 * 5;

    console.log('[importProductsFile] key:', key);

    const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
    });

    const url = await getSignedUrl(s3Client, command, {
        expiresIn: signedUrlExpireSeconds,
    });

    console.log('[importProductsFile] signed url:', url);

    return {
        statusCode: 200,
        headers,
        body: url,
    };
};

import { S3Event, S3Handler } from 'aws-lambda';
import {
    S3Client,
    GetObjectCommand,
    CopyObjectCommand,
    DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import csvParser from 'csv-parser';
import { Readable } from 'stream';
import { ProductItemInCSV } from '../../types/product';

const s3Client = new S3Client();

const sqsClient = new SQSClient();

const SQS_URL = process.env.SQS_URL;

const parseCSV = (stream: Readable): Promise<ProductItemInCSV[]> => {
    let hasData = false;

    return new Promise((resolve, reject): void => {
        stream
            .pipe(csvParser())
            .on('data', async (data: ProductItemInCSV) => {
                hasData = true;

                await sendToSqs(data);
            })
            .on('end', () => {
                console.log('[fileParser] end event');

                if (!hasData) {
                    console.log('[fileParser] No data found in CSV file.');
                }

                console.log('[fileParser] CSV file processed successfully');
            })
            .on('error', (error: string) => {
                console.error('[fileParser] error event');
                console.error('[fileParser] Error processing CSV file:', error);
                reject(error);
            });
    });
};

const getObject = async (bucket: string, key: string) => {
    const command: GetObjectCommand = new GetObjectCommand({
        Bucket: bucket,
        Key: key,
    });
    return s3Client.send(command);
};

const copyObject = async (bucket: string, key: string, newKey: string) => {
    const command: CopyObjectCommand = new CopyObjectCommand({
        Bucket: bucket,
        CopySource: `${bucket}/${key}`,
        Key: newKey,
    });
    return s3Client.send(command);
};

const deleteObject = async (bucket: string, key: string) => {
    const command: DeleteObjectCommand = new DeleteObjectCommand({
        Bucket: bucket,
        Key: key,
    });
    return s3Client.send(command);
};

const sendToSqs = async (data: ProductItemInCSV) => {
    console.log('[fileParser] sendToSqs, data: ', data);
    console.log('[fileParser] sendToSqs, SQS_URL: ', SQS_URL);

    const sqsParams = {
        QueueUrl: SQS_URL,
        MessageBody: JSON.stringify(data),
    };

    console.log('[fileParser] sendToSqs, sqsParams', sqsParams);

    try {
        const command = new SendMessageCommand(sqsParams);
        await sqsClient.send(command);

        console.log('[fileParser] sendToSqs, success');
    } catch (error) {
        console.error('Error sending message to SQS:', error);
    }
};

export const handler: S3Handler = async (event: S3Event) => {
    console.log(
        '[fileParser] Incoming S3 event:',
        JSON.stringify(event, null, 2)
    );

    const bucketName = event.Records[0].s3.bucket.name;
    const key = event.Records[0].s3.object.key;

    const params = {
        Bucket: bucketName,
        Key: key,
    };

    console.log('[fileParser] params:', params);

    try {
        const data = await getObject(bucketName, key);

        if (!data.Body) {
            throw new Error('[fileParser] data.Body is undefined');
        }

        const s3Stream = data.Body as Readable;

        await parseCSV(s3Stream);

        const parsedKey = key.replace('uploaded/', 'parsed/');

        console.log('[fileParser] Copying file to:', parsedKey);
        await copyObject(bucketName, key, parsedKey);

        console.log('[fileParser] Deleting file from:', key);
        await deleteObject(bucketName, key);

        console.log('[fileParser] File moved to parsed folder successfully');
    } catch (error) {
        console.error('[fileParser] Error getting object from S3:', error);
    }
};

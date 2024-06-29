import { S3Event, S3Handler } from 'aws-lambda';
import {
    S3Client,
    GetObjectCommand,
    CopyObjectCommand,
    DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import * as csvParser from 'csv-parser';
import { Readable } from 'stream';

const s3Client = new S3Client();

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

    console.log('[fileParser] bucketName:', params);

    try {
        const command = new GetObjectCommand(params);
        const data = await s3Client.send(command);

        const s3Stream = data.Body as Readable;

        let hasData = false;

        s3Stream
            .pipe(csvParser())
            .on('data', (data) => {
                hasData = true;
                console.log('[fileParser] [data], Record:', data);
            })
            .on('end', async () => {
                console.log('[fileParser] end event');

                if (!hasData) {
                    console.log('[fileParser] No data found in CSV file.');
                }

                console.log('[fileParser] CSV file processed successfully');

                const parsedKey = key.replace('uploaded/', 'parsed/');
                const copyParams = {
                    Bucket: bucketName,
                    CopySource: `${bucketName}/${key}`,
                    Key: parsedKey,
                };
                console.log('[fileParser] Copying file to:', parsedKey);
                await s3Client.send(new CopyObjectCommand(copyParams));

                const deleteParams = {
                    Bucket: bucketName,
                    Key: key,
                };
                console.log('[fileParser] Deleting file from:', key);
                await s3Client.send(new DeleteObjectCommand(deleteParams));

                console.log(
                    '[fileParser] File moved to parsed folder successfully'
                );
            })
            .on('error', (error) => {
                console.error('[fileParser] error event');
                console.error('[fileParser] Error processing CSV file:', error);
            });
    } catch (error) {
        console.error('[fileParser] Error getting object from S3:', error);
    }
};

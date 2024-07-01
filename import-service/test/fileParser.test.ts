import { S3Event } from 'aws-lambda';
import {
    S3Client,
    GetObjectCommand,
    CopyObjectCommand,
    DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { mockClient } from 'aws-sdk-client-mock';
import { Readable } from 'stream';
import { handler } from '../handlers/parser/fileParser';
import 'aws-sdk-client-mock-jest';

const s3Mock = mockClient(S3Client);

describe('Lambda Handler', () => {
    let logSpy: jest.SpyInstance;

    beforeAll(() => {
        logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
        jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterAll(() => {
        logSpy.mockRestore();
        jest.restoreAllMocks();
    });

    beforeEach(() => {
        s3Mock.reset();
    });

    it('should process the S3 event correctly', async () => {
        const s3Stream = new Readable();
        s3Stream.push('header1,header2\nvalue1,value2\n');
        s3Stream.push(null);
        // @ts-ignore
        s3Mock.on(GetObjectCommand).resolves({ Body: s3Stream });
        s3Mock.on(CopyObjectCommand).resolves({});
        s3Mock.on(DeleteObjectCommand).resolves({});

        const event: S3Event = {
            Records: [
                {
                    s3: {
                        // @ts-ignore
                        bucket: {
                            name: 'test-bucket',
                        },
                        // @ts-ignore
                        object: {
                            key: 'uploaded/test-file.csv',
                        },
                    },
                },
            ],
        };

        // @ts-ignore
        await handler(event);

        // Verify S3 operations
        expect(s3Mock).toHaveReceivedCommandTimes(GetObjectCommand, 1);
        expect(s3Mock).toHaveReceivedCommandTimes(CopyObjectCommand, 1);
        expect(s3Mock).toHaveReceivedCommandTimes(DeleteObjectCommand, 1);

        expect(logSpy).toHaveBeenCalledWith('[fileParser] parsed products: ', [
            { header1: 'value1', header2: 'value2' },
        ]);
    });

    it('should handle errors gracefully', async () => {
        s3Mock.on(GetObjectCommand).rejects(new Error('S3 error'));

        const event: S3Event = {
            Records: [
                {
                    s3: {
                        // @ts-ignore
                        bucket: {
                            name: 'test-bucket',
                        },
                        // @ts-ignore
                        object: {
                            key: 'uploaded/test-file.csv',
                        },
                    },
                },
            ],
        };

        // @ts-ignore
        await expect(handler(event)).resolves.toBeUndefined();

        // Verify S3 operations
        expect(s3Mock).toHaveReceivedCommandTimes(GetObjectCommand, 1);
        expect(s3Mock).not.toHaveReceivedCommand(CopyObjectCommand);
        expect(s3Mock).not.toHaveReceivedCommand(DeleteObjectCommand);

        // Check if error was logged
        expect(console.error).toHaveBeenCalledWith(
            '[fileParser] Error getting object from S3:',
            expect.any(Error)
        );
    });
});

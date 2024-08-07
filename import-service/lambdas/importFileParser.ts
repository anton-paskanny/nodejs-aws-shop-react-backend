import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as s3n from 'aws-cdk-lib/aws-s3-notifications';

import { Construct } from 'constructs';
import { S3_BUCKET_NAME } from '../utils/constants';

export class FileParserLambda extends Construct {
    public readonly lambdaFunction: lambda.Function;

    constructor(scope: Construct, id: string) {
        super(scope, id);

        const bucket = s3.Bucket.fromBucketName(
            this,
            'ImportedBucket',
            S3_BUCKET_NAME
        );

        const catalogItemsQueueArn = cdk.Fn.importValue('CatalogItemsQueueArn');
        const catalogItemsQueue = sqs.Queue.fromQueueArn(
            this,
            'CatalogItemsQueue',
            catalogItemsQueueArn
        );

        this.lambdaFunction = new lambda.Function(this, 'FileParserHandler', {
            runtime: lambda.Runtime.NODEJS_20_X,
            code: lambda.Code.fromAsset('handlers/parser'),
            handler: 'fileParser.handler',
            environment: {
                BUCKET_NAME: bucket.bucketName,
                SQS_URL: catalogItemsQueue.queueUrl,
            },
        });

        bucket.grantReadWrite(this.lambdaFunction);
        bucket.grantPut(this.lambdaFunction);
        bucket.grantDelete(this.lambdaFunction);

        bucket.addEventNotification(
            s3.EventType.OBJECT_CREATED,
            new s3n.LambdaDestination(this.lambdaFunction),
            { prefix: 'uploaded/' }
        );

        catalogItemsQueue.grantSendMessages(this.lambdaFunction);
    }
}

import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as s3 from 'aws-cdk-lib/aws-s3';

import { Construct } from 'constructs';
import { S3_BUCKET_NAME } from '../utils/constants';

export class ImportProductsFileLambda extends Construct {
    public readonly lambdaFunction: lambda.Function;

    constructor(scope: Construct, id: string) {
        super(scope, id);

        const bucket = s3.Bucket.fromBucketName(
            this,
            'ImportedBucket',
            S3_BUCKET_NAME
        );

        this.lambdaFunction = new lambda.Function(
            this,
            'ImportProductsFileHandler',
            {
                runtime: lambda.Runtime.NODEJS_20_X,
                code: lambda.Code.fromAsset('handlers'),
                handler: 'importProductsFile.handler',
                environment: {
                    BUCKET_NAME: bucket.bucketName,
                },
            }
        );

        bucket.grantReadWrite(this.lambdaFunction);
        bucket.grantPut(this.lambdaFunction);
    }
}

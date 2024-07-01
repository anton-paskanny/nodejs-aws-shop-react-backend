import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { ImportProductsFileLambda } from '../lambdas/importProductsFile';
import { FileParserLambda } from '../lambdas/importFileParser';
import { ImportApi } from '../api/api-gateway';
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class ImportServiceStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        const importProductsFileLambda = new ImportProductsFileLambda(
            this,
            'ImportProductsFileLambda'
        );

        new FileParserLambda(this, 'ParseFileLambda');

        new ImportApi(this, 'ImportApi', {
            importProductsFileLambda: importProductsFileLambda.lambdaFunction,
        });
    }
}

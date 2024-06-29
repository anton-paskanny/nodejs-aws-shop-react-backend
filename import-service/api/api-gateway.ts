import * as cdk from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';

interface ImportApiProps extends cdk.StackProps {
    importProductsFileLambda: lambda.Function;
}

export class ImportApi extends Construct {
    constructor(scope: Construct, id: string, props: ImportApiProps) {
        super(scope, id);

        const api = new apigateway.RestApi(this, 'ImportServiceApi', {
            restApiName: 'Import Service',
            description: 'This service is responsible for importing csv files.',
            defaultCorsPreflightOptions: {
                allowOrigins: apigateway.Cors.ALL_ORIGINS,
                allowMethods: apigateway.Cors.ALL_METHODS,
            },
        });

        const importResource = api.root.addResource('import');

        const importProductsFilesIntegration = new apigateway.LambdaIntegration(
            props.importProductsFileLambda
        );
        importResource.addMethod('GET', importProductsFilesIntegration, {
            requestParameters: {
                'method.request.querystring.name': true,
            },
        });
    }
}

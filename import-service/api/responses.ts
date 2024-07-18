import * as apigateway from 'aws-cdk-lib/aws-apigateway';

export const DEFAULT_4XX = {
    type: apigateway.ResponseType.DEFAULT_4XX,
    responseHeaders: {
        'Access-Control-Allow-Origin': "'*'",
    },
};

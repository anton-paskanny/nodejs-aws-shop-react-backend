import { APIGatewayTokenAuthorizerEvent, APIGatewayProxyResult, APIGatewayAuthorizerResult } from 'aws-lambda';
import { Base64 } from 'js-base64';
import { headers } from './headers';

type StatementEffect = "Allow" | "Deny";

const generatePolicy = (principalId: string, effect: StatementEffect, resource: string): APIGatewayAuthorizerResult => {
    return {
        principalId,
        policyDocument: {
            Version: '2012-10-17',
            Statement: [
                {
                    Action: 'execute-api:Invoke',
                    Effect: effect,
                    Resource: resource,
                },
            ],
        },
    };
};

export const handler = async (event: APIGatewayTokenAuthorizerEvent): Promise<APIGatewayAuthorizerResult | APIGatewayProxyResult> => {
    const authToken = event.authorizationToken;

    if (!authToken) {
        return {
            statusCode: 401,
            headers,
            body: JSON.stringify({ message: 'Unauthorized: No Authorization header provided' }),
        };
    }

    const [authType, token] = authToken.split(' ');

    if (authType !== 'Basic' || !token) {
        return {
            statusCode: 403,
            headers,
            body: JSON.stringify({ message: 'Forbidden: Invalid Authorization token' }),
        };
    }

    const decodedToken = Base64.decode(token);
    const [username, password] = decodedToken.split(':');

    const envPassword = process.env.SECRET_KEY;

    if (password && envPassword && password === envPassword) {
        const policy = generatePolicy(username, 'Allow', event.methodArn);
        console.log('[basicAthorizer] policy: ', policy);
        return policy;
    } else {
        return {
            statusCode: 403,
            headers,
            body: JSON.stringify({ message: 'Forbidden: Invalid credentials' }),
        };
    }
};

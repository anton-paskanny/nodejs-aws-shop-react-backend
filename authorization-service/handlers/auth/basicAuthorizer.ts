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
    console.log('[basicAthorizer] event: ', event);

    const authToken = event.authorizationToken;

    console.log('[basicAthorizer] authToken from event: ', authToken);

    if (!authToken) {
        console.log('Unauthorized: No Authorization header provided');
        return {
            statusCode: 401,
            headers,
            body: JSON.stringify({ message: 'Unauthorized: No Authorization header provided' }),
        };
    }

    const [authType, token] = authToken.split(' ');

    console.log('[basicAthorizer] token from split: ', token);
    console.log('[basicAthorizer] authType: ', authType);

    if (authType !== 'Basic' || !token) {
        console.log('Forbidden: Invalid Authorization token');
        return {
            statusCode: 403,
            headers,
            body: JSON.stringify({ message: 'Forbidden: Invalid Authorization token' }),
        };
    }

    const decodedToken = Base64.decode(token);
    const [username, password] = decodedToken.split(':');

    const envPassword = process.env.SECRET_KEY;

    console.log('[basicAthorizer] envPassword: ', envPassword);

    console.log('[basicAthorizer] username: ', username);

    console.log('[basicAthorizer] password: ', password);

    if (password && envPassword && password === envPassword) {
        const policy = generatePolicy(username, 'Allow', event.methodArn);
        console.log('[basicAthorizer] policy: ', policy);
        return policy;
    } else {
        console.log('[basicAthorizer] Forbidden: Invalid credentials');
        return {
            statusCode: 403,
            headers,
            body: JSON.stringify({ message: 'Forbidden: Invalid credentials' }),
        };
    }
};

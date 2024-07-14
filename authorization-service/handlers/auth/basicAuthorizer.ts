import { APIGatewayTokenAuthorizerEvent, APIGatewayAuthorizerResult } from 'aws-lambda';
import { Base64 } from 'js-base64';

type StatementEffect = "Allow" | "Deny";

const generatePolicy = (principalId: string, effect: StatementEffect, resource: string, statusCode: number): APIGatewayAuthorizerResult => {
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
        context: {
            statusCode,
          },
    };
};

export const handler = async (event: APIGatewayTokenAuthorizerEvent): Promise<APIGatewayAuthorizerResult> => {
    console.log('[basicAthorizer] event: ', event);

    const authToken = event.authorizationToken;

    console.log('[basicAthorizer] authToken from event: ', authToken);

    if (!authToken) {
        console.log('Unauthorized: No Authorization header provided');
        return generatePolicy('user', 'Deny', event.methodArn, 401);
    }

    const [authType, token] = authToken.split(' ');

    console.log('[basicAthorizer] token from split: ', token);
    console.log('[basicAthorizer] authType: ', authType);

    if (authType !== 'Basic' || !token) {
        console.log('Forbidden: Invalid Authorization token');
        return generatePolicy('user', 'Deny', event.methodArn, 403);
    }

    const decodedToken = Base64.decode(token);

    console.log('[basicAthorizer] decodedToken: ', decodedToken);

    const [username, password] = decodedToken.split('=');

    const envPassword = process.env.SECRET_KEY;

    console.log('[basicAthorizer] envPassword: ', envPassword);

    console.log('[basicAthorizer] username: ', username);

    console.log('[basicAthorizer] password: ', password);

    if (password && envPassword && password === envPassword) {
        const policy = generatePolicy(username, 'Allow', event.methodArn, 200);
        console.log('[basicAthorizer] policy: ', policy);
        return policy;
    } else {
        console.log('[basicAthorizer] Forbidden: Invalid credentials');
        return generatePolicy('user', 'Deny', event.methodArn, 403);
    }
};

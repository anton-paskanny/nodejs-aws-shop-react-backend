import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';

const snsClient = new SNSClient();

export type SnsMessageParamsType = {
    products: any[];
    messageTitle: string;
    subject: string;
    topicArn: string;
    attributes?: any;
};

export const sendSnsMessage = async ({
    products,
    messageTitle,
    subject,
    topicArn,
    attributes,
}: SnsMessageParamsType) => {
    let productsMessage = '';

    for (let productItem of products) {
        const { title, description, price, id, count } = productItem;
        productsMessage += `*** ID - ${id}; Title - ${title}; Price - ${price}; Desc - ${description}; Count - ${count}\n`;
    }

    const message = {
        Message: JSON.stringify({
            default: messageTitle,
            product: productsMessage,
        }),
        TopicArn: topicArn,
        Subject: subject,
        ...(attributes ? { attributes } : {}),
    };

    const publishCommand = new PublishCommand(message);
    await snsClient.send(publishCommand);
};

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { SNSClient } from '@aws-sdk/client-sns';

export const mockDynamoDBClient = {
    send: jest.fn().mockResolvedValue({}),
};

export const mockDynamoDBClientConstructor = jest
    .fn()
    .mockReturnValue(mockDynamoDBClient);

jest.mock('@aws-sdk/client-dynamodb', () => ({
    DynamoDBClient: mockDynamoDBClientConstructor,
    BatchWriteItemCommand: jest.fn(),
}));

export const mockSNSClient = {
    send: jest.fn().mockResolvedValue({}),
};

export const mockSNSClientConstructor = jest
    .fn()
    .mockReturnValue(mockSNSClient);

jest.mock('@aws-sdk/client-sns', () => ({
    SNSClient: mockSNSClientConstructor,
    PublishCommand: jest.fn((message) => ({ ...message })),
}));

beforeEach(() => {
    jest.clearAllMocks();
});

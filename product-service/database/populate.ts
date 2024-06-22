import { DynamoDBClient, DescribeTableCommand } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';

import { productsListMock } from '../mocks/products';
import { stocksListMock } from '../mocks/stocks';
import {
    PRODUCT_SERVICE_TABLES,
    PRODUCT_SERVICE_AWS_REGION,
} from '../utils/constants';

const client = new DynamoDBClient({ region: PRODUCT_SERVICE_AWS_REGION });
const ddbDocClient = DynamoDBDocumentClient.from(client);

const productsMockData = productsListMock;
const stocksMockData = stocksListMock;

const checkTableExists = async (tableName: string): Promise<boolean> => {
    try {
        const params = { TableName: tableName };
        await client.send(new DescribeTableCommand(params));
        return true;
    } catch (err: any) {
        if (err.name === 'ResourceNotFoundException') {
            console.error(`Table ${tableName} does not exist.`);
        } else {
            console.error(`Error checking table ${tableName}:`, err);
        }
        return false;
    }
};

const putItems = async (tableName: string, items: any[]): Promise<void> => {
    for (const item of items) {
        const params = {
            TableName: tableName,
            Item: item,
        };

        try {
            await ddbDocClient.send(new PutCommand(params));
            console.log(
                `The following item was added to the ${tableName} table:`,
                item
            );
        } catch (err) {
            console.error('Error occured while adding item:', err);
        }
    }
};

const populateTables = async (): Promise<void> => {
    const productsTableExists = await checkTableExists(
        PRODUCT_SERVICE_TABLES.products
    );
    const stocksTableExists = await checkTableExists(
        PRODUCT_SERVICE_TABLES.stocks
    );

    if (productsTableExists) {
        await putItems(PRODUCT_SERVICE_TABLES.products, productsMockData);
    }

    if (stocksTableExists) {
        await putItems(PRODUCT_SERVICE_TABLES.stocks, stocksMockData);
    }

    if (!productsTableExists || !stocksTableExists) {
        console.log(
            'It seems like one or more tables do not exist. Please, check your dynamodb tables.'
        );
        return;
    }
};

populateTables();

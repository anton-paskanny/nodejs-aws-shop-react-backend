import {
    DynamoDBClient,
    ScanCommand,
    DeleteItemCommand,
    DescribeTableCommand,
} from '@aws-sdk/client-dynamodb';
import {
    DynamoDBDocumentClient,
    ScanCommandInput,
    DeleteCommandInput,
} from '@aws-sdk/lib-dynamodb';
import { PRODUCT_SERVICE_TABLES } from '../utils/constants';

const client = new DynamoDBClient();
const ddbDocClient = DynamoDBDocumentClient.from(client);

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

const deleteItems = async (
    tableName: string,
    primaryKey: string
): Promise<void> => {
    try {
        const scanParams: ScanCommandInput = { TableName: tableName };
        const data = await ddbDocClient.send(new ScanCommand(scanParams));

        if (data.Items) {
            for (const item of data.Items) {
                const deleteParams: DeleteCommandInput = {
                    TableName: tableName,
                    Key: {
                        [primaryKey]: item[primaryKey],
                    },
                };

                try {
                    await ddbDocClient.send(
                        new DeleteItemCommand(deleteParams)
                    );
                    console.log(`Deleted item from ${tableName}:`, item);
                } catch (err) {
                    console.error('Error deleting item:', err);
                }
            }
        } else {
            console.log(`No items found in table ${tableName}.`);
        }
    } catch (err) {
        console.error(`Error scanning table ${tableName}:`, err);
    }
};

const clearTables = async (): Promise<void> => {
    const productsTableExists = await checkTableExists(
        PRODUCT_SERVICE_TABLES.products
    );
    const stocksTableExists = await checkTableExists(
        PRODUCT_SERVICE_TABLES.stocks
    );

    if (productsTableExists) {
        await deleteItems(PRODUCT_SERVICE_TABLES.products, 'id');
    } else {
        console.log(
            `Table ${PRODUCT_SERVICE_TABLES.products} does not exist. Skipping deletion.`
        );
    }

    if (stocksTableExists) {
        await deleteItems(PRODUCT_SERVICE_TABLES.stocks, 'product_id');
    } else {
        console.log(
            `Table ${PRODUCT_SERVICE_TABLES.stocks} does not exist. Skipping deletion.`
        );
    }

    console.log('Finished clearing tables.');
};

clearTables();

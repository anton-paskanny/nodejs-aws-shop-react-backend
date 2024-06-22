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
import {
    PRODUCT_SERVICE_TABLES,
    PRODUCT_SERVICE_AWS_REGION,
} from '../utils/constants';

const client = new DynamoDBClient({ region: PRODUCT_SERVICE_AWS_REGION });
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

const deleteItems = async (tableName: string): Promise<void> => {
    try {
        const scanParams: ScanCommandInput = { TableName: tableName };
        const data = await ddbDocClient.send(new ScanCommand(scanParams));

        if (data.Items) {
            for (const item of data.Items) {
                const deleteParams: DeleteCommandInput = {
                    TableName: tableName,
                    Key: { id: item.id },
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
        await deleteItems(PRODUCT_SERVICE_TABLES.products);
    } else {
        console.log(
            `Table ${PRODUCT_SERVICE_TABLES.products} does not exist. Skipping deletion.`
        );
    }

    if (stocksTableExists) {
        await deleteItems(PRODUCT_SERVICE_TABLES.stocks);
    } else {
        console.log(
            `Table ${PRODUCT_SERVICE_TABLES.stocks} does not exist. Skipping deletion.`
        );
    }

    console.log('Finished clearing tables.');
};

clearTables();
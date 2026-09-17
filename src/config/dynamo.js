import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

export const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME || "logicfruit_cms";

/**
 * Check if AWS DynamoDB credentials are configured
 */
export function isDynamoDBConfigured() {
  return Boolean(
    process.env.AWS_ACCESS_KEY_ID &&
    process.env.AWS_SECRET_ACCESS_KEY
  );
}

let docClient = null;

/**
 * Get or create the DynamoDB Document Client
 */
export function getDocClient() {
  if (!docClient && isDynamoDBConfigured()) {
    const credentials = {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    };

    if (process.env.AWS_SESSION_TOKEN) {
      credentials.sessionToken = process.env.AWS_SESSION_TOKEN;
    }

    const ddbClient = new DynamoDBClient({
      region: process.env.AWS_REGION || "ap-south-1",
      credentials,
    });

    docClient = DynamoDBDocumentClient.from(ddbClient, {
      marshallOptions: {
        removeUndefinedValues: true,
      },
    });
  }
  return docClient;
}

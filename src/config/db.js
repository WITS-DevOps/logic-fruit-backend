import { DescribeTableCommand } from "@aws-sdk/client-dynamodb";
import { getDocClient, TABLE_NAME, isDynamoDBConfigured } from "./dynamo.js";
import { isLocalStorageActive } from "./storageMode.js";

/**
 * Check and verify database connection
 */
export async function connectDB() {
  if (isLocalStorageActive()) {
    console.log("📁 Local Storage Mode ACTIVE:");
    console.log("   - CMS Data: backend/data/local_db.json");
    console.log("   - Uploads:  backend/uploads/");
    return;
  }

  if (!isDynamoDBConfigured()) {
    console.log("⚠️  AWS DynamoDB credentials not configured. Please check your .env file.");
    return;
  }

  try {
    const docClient = getDocClient();
    if (docClient) {
      console.log(`✅ AWS DynamoDB Connected: Using table '${TABLE_NAME}' in ${process.env.AWS_REGION || "ap-south-1"}`);
    }
  } catch (error) {
    console.error(`❌ AWS DynamoDB Connection Error: ${error.message}`);
  }
}


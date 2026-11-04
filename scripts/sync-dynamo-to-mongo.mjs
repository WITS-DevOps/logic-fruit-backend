import "dotenv/config";
import dns from "dns";
dns.setServers(["8.8.8.8", "8.8.4.4"]);
import mongoose from "mongoose";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { CmsItem } from "../src/services/mongoDataService.js";

const MONGO_URI = process.env.MONGODB_URI;
if (!MONGO_URI) {
  console.error("Error: MONGODB_URI environment variable is required.");
  process.exit(1);
}

const ddbClient = new DynamoDBClient({
  region: process.env.AWS_REGION || "ap-south-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});
const docClient = DynamoDBDocumentClient.from(ddbClient);

async function scanAllDynamoItems(tableName) {
  let items = [];
  let lastEvaluatedKey = undefined;

  do {
    const res = await docClient.send(
      new ScanCommand({
        TableName: tableName,
        ExclusiveStartKey: lastEvaluatedKey,
      })
    );
    if (res.Items) {
      items = items.concat(res.Items);
    }
    lastEvaluatedKey = res.LastEvaluatedKey;
    process.stdout.write(`\rScanned ${items.length} items from DynamoDB...`);
  } while (lastEvaluatedKey);

  console.log(`\nCompleted DynamoDB scan: Total ${items.length} items.`);
  return items;
}

async function migrate() {
  console.log("=== Migrating Data: DynamoDB -> MongoDB Atlas ===");
  console.log(`Connecting to MongoDB Atlas...`);
  await mongoose.connect(MONGO_URI);
  console.log("Connected to MongoDB Atlas!");

  const tableName = process.env.DYNAMODB_TABLE_NAME || "logicfruit_cms";
  console.log(`Scanning DynamoDB table '${tableName}'...`);
  const items = await scanAllDynamoItems(tableName);

  console.log(`Upserting ${items.length} items into MongoDB 'cms_items'...`);

  const counts = {};
  let count = 0;

  for (const item of items) {
    const id = item.id || item._id;
    if (!id) continue;

    const entityType = item.entityType || "general";
    counts[entityType] = (counts[entityType] || 0) + 1;

    await CmsItem.findOneAndUpdate(
      { id },
      {
        ...item,
        id,
        _id: id,
        entityType,
      },
      { upsert: true, new: true }
    );

    count++;
    if (count % 50 === 0 || count === items.length) {
      process.stdout.write(`\rMigrated ${count}/${items.length} items...`);
    }
  }

  console.log("\nMigration completed successfully!");
  console.log("Breakdown by entityType:");
  console.table(counts);

  await mongoose.disconnect();
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});

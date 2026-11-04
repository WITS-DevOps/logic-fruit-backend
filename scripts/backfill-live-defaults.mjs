import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";

const TABLE_NAME = process.env.DYNAMODB_TABLE || "logicfruit_cms";
const REGION = process.env.AWS_REGION || "ap-south-1";

const client = new DynamoDBClient({ region: REGION });
const docClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: { removeUndefinedValues: true },
});

async function backfillDefaults() {
  console.log(`Starting optional backfill for table: ${TABLE_NAME} (${REGION})...`);

  // 1. Scan all items
  const scanRes = await docClient.send(new ScanCommand({ TableName: TABLE_NAME }));
  const items = scanRes.Items || [];
  console.log(`Found ${items.length} total items in table.`);

  let updatedProducts = 0;
  let updatedWhitepapers = 0;

  for (const item of items) {
    // A. Product
    if (item.type === "product") {
      if (item.buttonText === undefined) {
        const defaultButton = item.datasheetUrl ? "Download Datasheet" : "Contact Us";
        await docClient.send(
          new UpdateCommand({
            TableName: TABLE_NAME,
            Key: { id: item.id },
            UpdateExpression: "SET buttonText = :btn",
            ExpressionAttributeValues: { ":btn": defaultButton },
          })
        );
        updatedProducts++;
        console.log(`Updated Product [${item.slug || item.id}] with buttonText: ${defaultButton}`);
      }
    }

    // B. Whitepaper
    if (item.type === "whitepaper") {
      const updates = [];
      const values = {};

      if (item.cardTitle === undefined) {
        updates.push("cardTitle = :ct");
        values[":ct"] = "";
      }
      if (item.cardDescription === undefined) {
        updates.push("cardDescription = :cd");
        values[":cd"] = "";
      }
      if (item.buttonText === undefined) {
        updates.push("buttonText = :bt");
        values[":bt"] = "";
      }
      if (item.secondaryButtonText === undefined) {
        updates.push("secondaryButtonText = :sbt");
        values[":sbt"] = "";
      }

      if (updates.length > 0) {
        await docClient.send(
          new UpdateCommand({
            TableName: TABLE_NAME,
            Key: { id: item.id },
            UpdateExpression: `SET ${updates.join(", ")}`,
            ExpressionAttributeValues: values,
          })
        );
        updatedWhitepapers++;
        console.log(`Updated Whitepaper [${item.slug || item.id}] with default fields.`);
      }
    }
  }

  console.log(`\nBackfill complete! Updated ${updatedProducts} products and ${updatedWhitepapers} whitepapers.`);
}

backfillDefaults().catch((err) => {
  console.error("Backfill failed:", err.message);
  process.exit(1);
});

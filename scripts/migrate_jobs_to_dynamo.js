/**
 * Migration Script: Migrate Current Job Openings to AWS DynamoDB
 * 
 * Usage:
 *   node scripts/migrate_jobs_to_dynamo.js
 * 
 * Prerequisites:
 *   Ensure AWS credentials and AWS_DYNAMODB_TABLE_NAME are set in your backend/.env file.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { PutCommand } from "@aws-sdk/lib-dynamodb";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from backend/.env
dotenv.config({ path: path.join(__dirname, "../.env") });

import { getDocClient, TABLE_NAME } from "../src/config/dynamo.js";

const JOBS_FILE = path.join(__dirname, "../data/current_openings.json");

async function migrateJobs() {
  console.log("--------------------------------------------------");
  console.log("Starting Job Openings Migration to AWS DynamoDB");
  console.log("Target Table:", TABLE_NAME || "Not set");
  console.log("Source Data :", JOBS_FILE);
  console.log("--------------------------------------------------");

  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    console.error("Error: AWS credentials (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY) are missing in .env");
    process.exit(1);
  }

  const docClient = getDocClient();
  if (!docClient) {
    console.error("Error: DynamoDB Document Client could not be initialized.");
    process.exit(1);
  }

  const raw = await fs.promises.readFile(JOBS_FILE, "utf8");
  const jobs = JSON.parse(raw);

  if (!Array.isArray(jobs) || jobs.length === 0) {
    console.log("No job openings found to migrate.");
    return;
  }

  console.log(`Found ${jobs.length} job opening(s) to upload.\n`);

  let successCount = 0;
  let failCount = 0;

  for (const job of jobs) {
    const itemToSave = {
      ...job,
      entityType: "job",
      updatedAt: new Date().toISOString(),
    };

    try {
      await docClient.send(
        new PutCommand({
          TableName: TABLE_NAME,
          Item: itemToSave,
        })
      );
      console.log(`[OK] Uploaded: "${job.title}" (${job.slug})`);
      successCount++;
    } catch (err) {
      console.error(`[FAIL] Could not upload "${job.title}":`, err.message);
      failCount++;
    }
  }

  console.log("\n--------------------------------------------------");
  console.log(`Migration Complete: ${successCount} succeeded, ${failCount} failed.`);
  console.log("--------------------------------------------------");
}

migrateJobs().catch((err) => {
  console.error("Migration fatal error:", err);
  process.exit(1);
});

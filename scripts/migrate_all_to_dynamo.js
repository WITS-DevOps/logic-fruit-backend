/**
 * Master Migration Runner: Migrate Jobs, Blogs, News, Whitepapers, and Products to AWS DynamoDB & AWS S3
 * 
 * Usage:
 *   node scripts/migrate_all_to_dynamo.js
 */

import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const scripts = [
  { name: "Current Job Openings", file: "migrate_jobs_to_dynamo.js" },
  { name: "Engineering Blogs", file: "migrate_blogs_to_dynamo.js" },
  { name: "News Announcements", file: "migrate_news_to_dynamo.js" },
  { name: "Whitepapers & Documents", file: "migrate_whitepapers_to_dynamo.js" },
  { name: "Products Catalog (Hardware & Soft IP)", file: "migrate_products_to_dynamo.js" },
];

function runScript(script) {
  return new Promise((resolve, reject) => {
    console.log(`\n>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>`);
    console.log(`RUNNING MIGRATION: ${script.name} (${script.file})`);
    console.log(`<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n`);

    const child = spawn("node", [path.join(__dirname, script.file)], {
      stdio: "inherit",
      shell: true,
    });

    child.on("close", (code) => {
      if (code === 0) {
        console.log(`\n[SUCCESS] ${script.name} completed.\n`);
        resolve();
      } else {
        reject(new Error(`${script.name} failed with exit code ${code}`));
      }
    });

    child.on("error", (err) => {
      reject(err);
    });
  });
}

async function main() {
  console.log("==================================================");
  console.log("STARTING FULL MIGRATION TO AWS DYNAMODB & AWS S3");
  console.log("==================================================");

  for (const s of scripts) {
    await runScript(s);
  }

  console.log("\n==================================================");
  console.log("ALL 5 DATASETS SUCCESSFULLY MIGRATED TO AWS!");
  console.log("==================================================");
}

main().catch((err) => {
  console.error("Migration suite halted due to error:", err.message);
  process.exit(1);
});

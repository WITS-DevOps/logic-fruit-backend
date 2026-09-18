import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, "../data");
const DB_FILE = path.join(DATA_DIR, "local_db.json");
const OPENINGS_FILE = path.join(DATA_DIR, "current_openings.json");

async function seedJobs() {
  try {
    console.log("Reading current openings from:", OPENINGS_FILE);
    const openingsRaw = await fs.promises.readFile(OPENINGS_FILE, "utf8");
    const newJobs = JSON.parse(openingsRaw);

    let existingDb = [];
    if (fs.existsSync(DB_FILE)) {
      const dbRaw = await fs.promises.readFile(DB_FILE, "utf8");
      existingDb = JSON.parse(dbRaw);
      if (!Array.isArray(existingDb)) existingDb = [];
    }

    // Filter out any previous jobs
    const nonJobItems = existingDb.filter((item) => item.entityType !== "job");

    // Combine non-job items with the new 7 job openings
    const updatedDb = [...nonJobItems, ...newJobs];

    await fs.promises.writeFile(DB_FILE, JSON.stringify(updatedDb, null, 2), "utf8");
    console.log(`Successfully seeded ${newJobs.length} job openings into ${DB_FILE}`);
  } catch (error) {
    console.error("Failed to seed jobs:", error);
    process.exit(1);
  }
}

seedJobs();

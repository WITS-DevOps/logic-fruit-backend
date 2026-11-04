import dns from "dns";
import mongoose from "mongoose";

// Use public DNS fallback if system DNS fails SRV lookups (common on some Windows setups)
try {
  dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);
} catch {}
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

  // If MongoDB Atlas URI is provided, use MongoDB
  if (process.env.MONGODB_URI) {
    try {
      await mongoose.connect(process.env.MONGODB_URI);
      const safeUri = process.env.MONGODB_URI.replace(/:([^:@]+)@/, ":****@");
      console.log(`✅ MongoDB Atlas Connected: ${safeUri}`);
      return;
    } catch (error) {
      console.error(`❌ MongoDB Atlas Connection Error: ${error.message}`);
    }
  }

  if (!isDynamoDBConfigured()) {
    console.log("⚠️  Database credentials not configured. Please check your .env file.");
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

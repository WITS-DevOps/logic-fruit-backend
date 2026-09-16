import mongoose from "mongoose";

/**
 * Connect to MongoDB database
 */
export async function connectDB() {
  const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/logic_fruit_cms";

  try {
    const conn = await mongoose.connect(uri);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    console.log("ℹ️  Tip: Make sure your MongoDB service is running, or set MONGODB_URI in your .env file.");
  }
}

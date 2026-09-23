import express from "express";
import cors from "cors";
import "dotenv/config";
import path from "path";
import { fileURLToPath } from "url";

import { connectDB } from "./config/db.js";
import { isS3Configured } from "./config/s3.js";
import { isLocalStorageActive } from "./config/storageMode.js";
import { errorHandler } from "./middleware/errorHandler.js";

import blogRoutes from "./routes/blogRoutes.js";
import newsRoutes from "./routes/newsRoutes.js";
import whitepaperRoutes from "./routes/whitepaperRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js";
import jobRoutes from "./routes/jobRoutes.js";
import inquiryRoutes from "./routes/inquiryRoutes.js";
import emailRoutes from "./routes/emailRoutes.js";
import { generateDynamicSitemapXml } from "./services/sitemapService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5000;

// Connect to Database
connectDB();

// Middleware: CORS
// Allows localhost, production Vercel frontend, preview branches, and any custom CLIENT_URL
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  "https://logic-fruit-ui.vercel.app",
  ...(process.env.CLIENT_URL
    ? process.env.CLIENT_URL.split(",").map((url) => url.trim())
    : []),
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (curl, mobile, server-to-server)
      if (!origin) return callback(null, true);

      // Check if origin matches allowed list, localhost, or any *.vercel.app domain
      const isAllowed =
        allowedOrigins.includes("*") ||
        allowedOrigins.includes(origin) ||
        origin.endsWith(".vercel.app") ||
        origin.includes("localhost") ||
        origin.includes("127.0.0.1");

      if (isAllowed) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  })
);

// Middleware: Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve local uploads folder statically
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// Root Endpoint (Quick status check for browser & monitoring)
app.get("/", (req, res) => {
  res.json({
    status: "ok",
    name: "Logic Fruit Backend API",
    platform: process.env.VERCEL ? "Vercel Serverless" : "Local Node Server",
    healthCheck: "/api/health",
  });
});

// System Health Check Endpoint
app.get("/api/health", (req, res) => {
  const isLocal = isLocalStorageActive();
  res.json({
    status: "ok",
    message: "Logic Fruit Backend API is running smoothly",
    mode: isLocal ? "local" : "aws",
    database: isLocal
      ? "Local File Storage (backend/data/local_db.json)"
      : `AWS DynamoDB (${process.env.DYNAMODB_TABLE_NAME || "logicfruit_cms"})`,
    storage: isLocal
      ? "Local Storage (/uploads)"
      : (isS3Configured() ? `AWS S3 (${process.env.AWS_S3_BUCKET_NAME})` : "AWS S3 (Not configured)"),
    email: process.env.SMTP_USER
      ? `Configured (${process.env.SMTP_USER})`
      : "Not configured",
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use("/api/upload", uploadRoutes);
app.use("/api/blogs", blogRoutes);
app.use("/api/news", newsRoutes);
app.use("/api/whitepapers", whitepaperRoutes);
app.use("/api/products", productRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/inquiries", inquiryRoutes);
app.use("/api/email", emailRoutes);

// Dynamic Sitemap Endpoint (used by Vite frontend & Googlebot)
app.get("/api/sitemap.xml", async (req, res) => {
  try {
    const xml = await generateDynamicSitemapXml();
    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.send(xml);
  } catch (err) {
    res.status(500).json({ success: false, message: "Could not generate sitemap", error: err.message });
  }
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `API Route ${req.originalUrl} not found`,
  });
});

// Global Error Handler
app.use(errorHandler);

// Start Server locally (Vercel Serverless handles execution automatically)
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📊 Health Check: http://localhost:${PORT}/api/health`);
  });
}

export default app;

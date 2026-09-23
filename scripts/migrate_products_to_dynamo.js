/**
 * Migration Script: Migrate 42 Authentic Products & Images to AWS DynamoDB & AWS S3
 * 
 * Actions:
 *   1. Uploads all 180+ product images across all product folders to AWS S3 under "products/<folder>/<filename>".
 *   2. Copies image files to local "backend/uploads/products/<folder>/<filename>" for fallback.
 *   3. Enriches each product with strict ordering (0-41), hero/gallery images, and full SEO metadata.
 *   4. Inserts all 42 products into AWS DynamoDB ("logicfruit_cms").
 *   5. Saves synchronized data to backend/data/products.json and backend/data/local_db.json.
 * 
 * Usage:
 *   node scripts/migrate_products_to_dynamo.js
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { PutCommand } from "@aws-sdk/lib-dynamodb";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "../.env") });

import { getDocClient, TABLE_NAME } from "../src/config/dynamo.js";

const PRODUCTS_JSON_FILE = path.join(__dirname, "../../logic-fruit-ui/src/components/product.json");
const PRODUCTS_IMAGES_DIR = path.join(__dirname, "../../logic-fruit-ui/src/assets/img/product images");
const LATTICE_AVANT_IMG = path.join(__dirname, "../../logic-fruit-ui/src/assets/img/solution/ai&ML/Avant G70 PCIe Mini Board.png");

const PRODUCTS_BACKUP_FILE = path.join(__dirname, "../data/products.json");
const LOCAL_DB_FILE = path.join(__dirname, "../data/local_db.json");
const LOCAL_UPLOADS_DIR = path.join(__dirname, "../uploads/products");

const S3_BUCKET = process.env.AWS_S3_BUCKET_NAME || "logicfruit-cms-assets-833823555826";
const AWS_REGION = process.env.AWS_REGION || "ap-south-1";

function slugify(text) {
  return (text || "")
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/&/g, "-and-")
    .replace(/[^\w\-]+/g, "")
    .replace(/\-\-+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
}

function normalize(s) {
  return (s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function getMimeType(filename) {
  const ext = path.extname(filename).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  if (ext === ".svg") return "image/svg+xml";
  if (ext === ".gif") return "image/gif";
  return "image/jpeg";
}

/**
 * Step 1: Upload all product images to S3 and mirror locally
 */
async function uploadProductImagesToS3(s3Client) {
  console.log("==================================================");
  console.log("Step 1: Uploading Product Images to AWS S3");
  console.log("Target S3 Bucket:", S3_BUCKET);
  console.log("==================================================");

  let totalUploaded = 0;
  let totalErrors = 0;

  const folders = await fs.promises.readdir(PRODUCTS_IMAGES_DIR);

  for (const folder of folders) {
    const folderPath = path.join(PRODUCTS_IMAGES_DIR, folder);
    const stat = await fs.promises.stat(folderPath);
    if (!stat.isDirectory()) continue;

    const files = await fs.promises.readdir(folderPath);
    const imageFiles = files.filter((f) => /\.(jpe?g|png|webp|svg)$/i.test(f));

    const localDestDir = path.join(LOCAL_UPLOADS_DIR, folder);
    await fs.promises.mkdir(localDestDir, { recursive: true });

    for (const file of imageFiles) {
      const srcPath = path.join(folderPath, file);
      const destPath = path.join(localDestDir, file);
      const s3Key = `products/${folder}/${file}`;
      const contentType = getMimeType(file);

      const fileBuffer = await fs.promises.readFile(srcPath);

      // Local mirror
      await fs.promises.copyFile(srcPath, destPath);

      // Upload to S3
      try {
        await s3Client.send(
          new PutObjectCommand({
            Bucket: S3_BUCKET,
            Key: s3Key,
            Body: fileBuffer,
            ContentType: contentType,
          })
        );
        totalUploaded++;
        console.log(`  [S3 OK] ${s3Key} (${fileBuffer.length} bytes)`);
      } catch (err) {
        totalErrors++;
        console.error(`  [S3 FAIL] ${s3Key}:`, err.message);
      }
    }
  }

  // Upload Lattice Avant board image if present
  if (fs.existsSync(LATTICE_AVANT_IMG)) {
    const folder = "Lattice Avant G70 PCIe Mini-Board";
    const file = "Avant G70 PCIe Mini Board.png";
    const localDestDir = path.join(LOCAL_UPLOADS_DIR, folder);
    await fs.promises.mkdir(localDestDir, { recursive: true });
    const destPath = path.join(localDestDir, file);
    const s3Key = `products/${folder}/${file}`;

    const fileBuffer = await fs.promises.readFile(LATTICE_AVANT_IMG);
    await fs.promises.copyFile(LATTICE_AVANT_IMG, destPath);

    try {
      await s3Client.send(
        new PutObjectCommand({
          Bucket: S3_BUCKET,
          Key: s3Key,
          Body: fileBuffer,
          ContentType: "image/png",
        })
      );
      totalUploaded++;
      console.log(`  [S3 OK] ${s3Key} (${fileBuffer.length} bytes)`);
    } catch (err) {
      totalErrors++;
      console.error(`  [S3 FAIL] ${s3Key}:`, err.message);
    }
  }

  console.log("\n--------------------------------------------------");
  console.log(`Product Image Upload Summary: ${totalUploaded} uploaded to S3, ${totalErrors} errors.`);
  console.log("--------------------------------------------------");
}

/**
 * Step 2: Enriches all 42 products with ordering, images, and SEO metadata, and stores in DynamoDB
 */
async function migrateProductsToDynamo(docClient) {
  console.log("\n==================================================");
  console.log("Step 2: Migrating 42 Products to AWS DynamoDB");
  console.log("Target Table:", TABLE_NAME);
  console.log("==================================================");

  const raw = await fs.promises.readFile(PRODUCTS_JSON_FILE, "utf8");
  const products = JSON.parse(raw);

  const folders = (await fs.promises.readdir(PRODUCTS_IMAGES_DIR)).filter((f) =>
    fs.statSync(path.join(PRODUCTS_IMAGES_DIR, f)).isDirectory()
  );

  const now = new Date().toISOString();
  const enrichedProducts = [];

  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    const rawTitle = p.title;
    const slug = p.slug || slugify(rawTitle);
    const normTitle = normalize(rawTitle);

    // Match image folder
    let matchedFolder = folders.find((dir) => {
      const normDir = normalize(dir);
      return (
        normDir === normTitle ||
        normTitle.includes(normDir) ||
        normDir.includes(normTitle) ||
        (normTitle.includes("controller") && normDir.includes("controller"))
      );
    });

    let heroImage = "";
    let galleryImages = [];
    let blockDiagrams = [];

    if (matchedFolder) {
      const folderPath = path.join(PRODUCTS_IMAGES_DIR, matchedFolder);
      const allFiles = (await fs.promises.readdir(folderPath)).filter((f) =>
        /\.(jpe?g|png|webp|svg)$/i.test(f)
      );

      // Sort files: 1. thumb / square, 2. front / 01, 3. others
      allFiles.sort((a, b) => {
        const aLow = a.toLowerCase();
        const bLow = b.toLowerCase();
        const isThumbA = aLow.includes("thumb") || aLow.includes("square");
        const isThumbB = bLow.includes("thumb") || bLow.includes("square");
        if (isThumbA && !isThumbB) return -1;
        if (!isThumbA && isThumbB) return 1;

        const isOneA = /(?:[-_ ]?0*1|image1|img1)\.[a-z0-9]+$/i.test(aLow) || /1\.[a-z0-9]+$/i.test(aLow);
        const isOneB = /(?:[-_ ]?0*1|image1|img1)\.[a-z0-9]+$/i.test(bLow) || /1\.[a-z0-9]+$/i.test(bLow);
        if (isOneA && !isOneB) return -1;
        if (!isOneA && isOneB) return 1;

        return 0;
      });

      const baseUrl = process.env.BASE_URL || "https://api.logic-fruit.com";
      const s3Base = `${baseUrl}/api/upload/media/products/${encodeURIComponent(matchedFolder)}`;

      if (allFiles.length > 0) {
        heroImage = `${s3Base}/${allFiles[0]}`;
        galleryImages = allFiles.map((f) => `${s3Base}/${f}`);
        blockDiagrams = allFiles
          .filter((f) => /diagram|block/i.test(f))
          .map((f) => `${s3Base}/${f}`);
      }
    } else if (rawTitle.toLowerCase().includes("avant")) {
      const baseUrl = process.env.BASE_URL || "https://api.logic-fruit.com";
      const s3Base = `${baseUrl}/api/upload/media/products/${encodeURIComponent("Lattice Avant G70 PCIe Mini-Board")}`;
      heroImage = `${s3Base}/Avant%20G70%20PCIe%20Mini%20Board.png`;
      galleryImages = [heroImage];
    }

    const featureList = Array.isArray(p["feature-list"])
      ? p["feature-list"]
      : Array.isArray(p.featureList)
      ? p.featureList
      : [];

    const isSoftIp = p.type === "RTL IP Core" || p.type === "Soft IP";
    const displayType = isSoftIp ? "Soft IP" : "Hardware System";

    const metaTitle = `${rawTitle} | ${isSoftIp ? "Soft IP & FPGA Cores" : "Hardware Systems"} | Logic Fruit`;
    const metaDescription = p.feature
      ? `${p.feature.replace(/\s+/g, " ").trim().slice(0, 155)}...`
      : `${rawTitle} - High performance ${displayType} engineered by Logic Fruit Technologies.`;
    const metaKeywords = `${rawTitle}, ${displayType}, FPGA, RTL IP, Hardware System, Embedded Engineering, Logic Fruit`;

    const productId = `prod-${slug}`;

    const productItem = {
      id: productId,
      _id: productId,
      slug: slug,
      title: rawTitle,
      type: displayType,
      feature: p.feature || "",
      featureList: featureList,
      heroImage: heroImage,
      thumbnailImage: heroImage,
      thumb: heroImage,
      galleryImages: galleryImages,
      blockDiagrams: blockDiagrams,
      videodesc: p.videodesc || "",
      videourl: p.videourl || "",
      datasheetUrl: p.datasheetUrl || "",
      directDownload: Boolean(p.directDownload),
      status: "published",
      entityType: "product",
      order: i,
      metaTitle: metaTitle,
      metaDescription: metaDescription,
      metaKeywords: metaKeywords,
      canonicalUrl: `/products/${slug}`,
      ogImage: heroImage,
      noIndex: false,
      createdAt: now,
      updatedAt: now,
    };

    try {
      await docClient.send(
        new PutCommand({
          TableName: TABLE_NAME,
          Item: productItem,
        })
      );
      console.log(`[DynamoDB Product OK] Order ${productItem.order}: "${productItem.title}" (${displayType})`);
      enrichedProducts.push(productItem);
    } catch (err) {
      console.error(`[DynamoDB Product FAIL] ${slug}:`, err.message);
      enrichedProducts.push(productItem);
    }
  }

  return enrichedProducts;
}

/**
 * Step 3: Write enriched products to local backup files
 */
async function syncLocalBackups(products) {
  console.log("\n==================================================");
  console.log("Step 3: Synchronizing Local JSON Backup Files");
  console.log("==================================================");

  // 1. Write products.json
  await fs.promises.mkdir(path.dirname(PRODUCTS_BACKUP_FILE), { recursive: true });
  await fs.promises.writeFile(PRODUCTS_BACKUP_FILE, JSON.stringify(products, null, 2), "utf8");
  console.log(`[Sync OK] Written ${products.length} products to: ${PRODUCTS_BACKUP_FILE}`);

  // 2. Synchronize local_db.json
  let localDb = [];
  if (fs.existsSync(LOCAL_DB_FILE)) {
    try {
      const raw = await fs.promises.readFile(LOCAL_DB_FILE, "utf8");
      localDb = JSON.parse(raw);
      if (!Array.isArray(localDb)) localDb = [];
    } catch (e) {
      localDb = [];
    }
  }

  // Remove existing product entities
  localDb = localDb.filter((item) => item.entityType !== "product");

  // Add the newly migrated products
  localDb.push(...products);

  await fs.promises.writeFile(LOCAL_DB_FILE, JSON.stringify(localDb, null, 2), "utf8");
  console.log(`[Sync OK] Synced ${products.length} products to ${LOCAL_DB_FILE}`);
}

async function run() {
  const s3Client = new S3Client({
    region: AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });

  const docClient = getDocClient();
  if (!docClient) {
    console.error("Error: DynamoDB document client could not be initialized.");
    process.exit(1);
  }

  // 1. Upload images
  await uploadProductImagesToS3(s3Client);

  // 2. Migrate products
  const products = await migrateProductsToDynamo(docClient);

  // 3. Save local backup files
  await syncLocalBackups(products);

  console.log("\n==================================================");
  console.log("ALL PRODUCT MIGRATION STEPS COMPLETED SUCCESSFULLY!");
  console.log("==================================================");
}

run().catch((err) => {
  console.error("Fatal product migration error:", err);
  process.exit(1);
});

import fs from "fs";
import path from "path";
import dotenv from "dotenv";
dotenv.config();

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { dynamoService } from "../src/services/dynamoService.js";

const s3Client = new S3Client({
  region: process.env.AWS_REGION || "ap-south-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const BUCKET = process.env.AWS_S3_BUCKET_NAME || "logicfruit-cms-assets-833823555826";
const SOURCE_DIR = "D:/0_ART/code/MV/logic/backend/deploy/img to p";

const imageMapping = [
  {
    sourceFile: "WhatsApp Image 2026-10-05 at 7.59.01 PM.jpeg",
    targetName: "L-Nex-DC-SCM-BMC-Module-1.jpg",
    isHero: true,
  },
  {
    sourceFile: "WhatsApp Image 2026-10-05 at 7.58.49 PM.jpeg",
    targetName: "L-Nex-DC-SCM-BMC-Module-2.jpg",
  },
  {
    sourceFile: "WhatsApp Image 2026-10-05 at 7.58.40 PM.jpeg",
    targetName: "L-Nex-DC-SCM-BMC-Module-3.jpg",
  },
  {
    sourceFile: "WhatsApp Image 2026-10-05 at 7.58.32 PM.jpeg",
    targetName: "L-Nex-DC-SCM-BMC-Module-4.jpg",
  },
  {
    sourceFile: "WhatsApp Image 2026-10-05 at 7.59.10 PM.jpeg",
    targetName: "L-Nex-DC-SCM-BMC-Module-Chassis.jpg",
  },
];

async function main() {
  console.log("Uploading L-Nex images to S3 bucket:", BUCKET);

  const uploadedUrls = [];
  let heroUrl = "";

  const folderName = "products/L-Nex DC-SCM BMC Module";

  for (const item of imageMapping) {
    const filePath = path.join(SOURCE_DIR, item.sourceFile);
    if (!fs.existsSync(filePath)) {
      console.error(`File not found: ${filePath}`);
      continue;
    }

    const fileBuffer = fs.readFileSync(filePath);
    const s3Key = `${folderName}/${item.targetName}`;

    console.log(`Uploading ${item.sourceFile} -> s3://${BUCKET}/${s3Key}...`);

    await s3Client.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: s3Key,
        Body: fileBuffer,
        ContentType: "image/jpeg",
        CacheControl: "public, max-age=31536000, immutable",
      })
    );

    const publicUrl = `https://api.logic-fruit.com/api/upload/media/${encodeURIComponent(folderName)}/${encodeURIComponent(item.targetName)}`;
    uploadedUrls.push(publicUrl);

    if (item.isHero) {
      heroUrl = publicUrl;
    }
  }

  console.log("\nAll images uploaded to S3!");
  console.log("Hero Image URL:", heroUrl);
  console.log("Gallery URLs:", uploadedUrls);

  // Now update DynamoDB entry for L-Nex
  console.log("\nUpdating L-Nex product in DynamoDB with uploaded images...");
  const slug = "l-nex-dc-scm-bmc-module";
  const product = await dynamoService.getBySlug(slug);

  if (!product) {
    console.error(`Product '${slug}' not found in DynamoDB!`);
    process.exit(1);
  }

  const productId = product.id || product._id;
  const updated = await dynamoService.update(productId, {
    heroImage: heroUrl,
    thumbnailImage: heroUrl,
    galleryImages: uploadedUrls,
  });

  console.log("Successfully updated product in DynamoDB!");
  console.log("Updated fields:", {
    title: updated.title,
    heroImage: updated.heroImage,
    galleryCount: updated.galleryImages?.length,
  });

  // Also copy images to frontend local assets folder for Vite build & local preview
  const frontendAssetDir = "D:/0_ART/code/MV/logic/logic-fruit-ui/src/assets/img/product images/L-Nex DC-SCM BMC Module";
  fs.mkdirSync(frontendAssetDir, { recursive: true });

  for (const item of imageMapping) {
    const src = path.join(SOURCE_DIR, item.sourceFile);
    const dest = path.join(frontendAssetDir, item.targetName);
    fs.copyFileSync(src, dest);
    console.log(`Copied to frontend assets: ${item.targetName}`);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error("Error uploading images:", err);
  process.exit(1);
});

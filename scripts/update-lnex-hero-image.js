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
const SOURCE_IMAGE = "D:/0_ART/code/MV/logic/backend/deploy/L-Nex-DC-SCM-BMC-Module-1-removebg-preview.png";

async function main() {
  if (!fs.existsSync(SOURCE_IMAGE)) {
    console.error("Source image not found:", SOURCE_IMAGE);
    process.exit(1);
  }

  const fileBuffer = fs.readFileSync(SOURCE_IMAGE);
  const folderName = "products/L-Nex DC-SCM BMC Module";
  const targetPngKey = `${folderName}/L-Nex-DC-SCM-BMC-Module-1.png`;
  const targetJpgKey = `${folderName}/L-Nex-DC-SCM-BMC-Module-1.jpg`;

  console.log(`Uploading PNG to S3: s3://${BUCKET}/${targetPngKey}...`);
  await s3Client.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: targetPngKey,
      Body: fileBuffer,
      ContentType: "image/png",
      CacheControl: "public, max-age=31536000, immutable",
    })
  );

  console.log(`Also updating JPEG key with PNG content to guarantee cache compatibility: s3://${BUCKET}/${targetJpgKey}...`);
  await s3Client.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: targetJpgKey,
      Body: fileBuffer,
      ContentType: "image/png",
      CacheControl: "public, max-age=0, must-revalidate",
    })
  );

  const pngUrl = `https://api.logic-fruit.com/api/upload/media/${encodeURIComponent(folderName)}/L-Nex-DC-SCM-BMC-Module-1.png`;
  console.log("Uploaded successfully! URL:", pngUrl);

  // Update DynamoDB product
  const slug = "l-nex-dc-scm-bmc-module";
  console.log(`Fetching product '${slug}' from DynamoDB...`);
  const product = await dynamoService.getBySlug(slug);

  if (product) {
    const productId = product.id || product._id;
    const oldGallery = Array.isArray(product.galleryImages) ? [...product.galleryImages] : [];
    if (oldGallery.length > 0) {
      oldGallery[0] = pngUrl;
    } else {
      oldGallery.push(pngUrl);
    }

    const updated = await dynamoService.update(productId, {
      heroImage: pngUrl,
      thumbnailImage: pngUrl,
      galleryImages: oldGallery,
    });
    console.log("DynamoDB successfully updated for L-Nex:", {
      id: productId,
      heroImage: updated.heroImage,
    });
  } else {
    console.warn(`Product '${slug}' not found in DynamoDB directly.`);
  }

  // Copy to frontend local assets
  const frontendAssetDir = "D:/0_ART/code/MV/logic/logic-fruit-ui/src/assets/img/product images/L-Nex DC-SCM BMC Module";
  fs.mkdirSync(frontendAssetDir, { recursive: true });
  fs.copyFileSync(SOURCE_IMAGE, path.join(frontendAssetDir, "L-Nex-DC-SCM-BMC-Module-1.png"));
  fs.copyFileSync(SOURCE_IMAGE, path.join(frontendAssetDir, "L-Nex-DC-SCM-BMC-Module-1.jpg"));
  console.log("Copied to frontend local assets directory.");

  console.log("All operations completed successfully!");
}

main().catch((err) => {
  console.error("Error updating hero image:", err);
  process.exit(1);
});

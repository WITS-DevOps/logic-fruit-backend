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

const DATASHEET_PATH = "D:/0_ART/code/MV/logic/logic-fruit-ui/figma references/L-Nex_compressed (1).pdf";
const FAQ_PATH = "D:/0_ART/code/MV/logic/backend/deploy/LFT_L-Nex_BMC_FAQs.pdf";

async function main() {
  console.log("Checking source PDF files...");
  if (!fs.existsSync(DATASHEET_PATH)) {
    throw new Error(`Datasheet not found at: ${DATASHEET_PATH}`);
  }
  if (!fs.existsSync(FAQ_PATH)) {
    throw new Error(`FAQ PDF not found at: ${FAQ_PATH}`);
  }

  // 1. Upload Datasheet PDF
  console.log("\n1. Uploading REAL Datasheet PDF to S3...");
  const datasheetBuf = fs.readFileSync(DATASHEET_PATH);
  const datasheetKey = "products/LFT_L-Nex_DC-SCM_BMC_Module_Datasheet.pdf";
  await s3Client.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: datasheetKey,
      Body: datasheetBuf,
      ContentType: "application/pdf",
      CacheControl: "public, max-age=31536000, immutable",
    })
  );
  const datasheetUrl = `https://api.logic-fruit.com/api/upload/media/${datasheetKey}`;
  console.log("✓ Datasheet URL:", datasheetUrl);

  // 2. Upload FAQ PDF
  console.log("\n2. Uploading FAQ PDF to S3...");
  const faqBuf = fs.readFileSync(FAQ_PATH);
  const faqKey = "products/LFT_L-Nex_BMC_FAQs.pdf";
  await s3Client.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: faqKey,
      Body: faqBuf,
      ContentType: "application/pdf",
      CacheControl: "public, max-age=31536000, immutable",
    })
  );
  const faqUrl = `https://api.logic-fruit.com/api/upload/media/${faqKey}`;
  console.log("✓ FAQ URL:", faqUrl);

  // 3. Update DynamoDB L-Nex record
  console.log("\n3. Updating DynamoDB record for L-Nex...");
  const slug = "l-nex-dc-scm-bmc-module";
  const allProducts = await dynamoService.getAll("product", { status: "all" });
  const lnex = allProducts.find((p) => p.slug === slug || p.slug?.includes("l-nex"));

  if (!lnex) {
    throw new Error(`L-Nex product not found in DynamoDB`);
  }

  const productId = lnex.id || lnex._id;
  const updateData = {
    datasheetUrl,
    faqPdfUrl: faqUrl,
    faqsPdf: faqUrl,
    faqPdf: faqUrl,
  };

  const updated = await dynamoService.update(productId, updateData);
  console.log("✓ DynamoDB updated successfully for L-Nex ID:", productId);
  console.log("Updated fields:", {
    datasheetUrl: updated.datasheetUrl,
    faqPdfUrl: updated.faqPdfUrl,
    faqsPdf: updated.faqsPdf,
  });

  console.log("\n🎉 ALL PDF UPLOADS AND DATABASE UPDATES COMPLETE!");
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});

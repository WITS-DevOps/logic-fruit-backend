import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const basicAuth = Buffer.from('logicfruit:logicfruite2026').toString('base64');
const S3_BUCKET = process.env.AWS_S3_BUCKET_NAME || 'logicfruit-cms-assets-833823555826';
const AWS_REGION = process.env.AWS_REGION || 'ap-south-1';

const s3Client = new S3Client({
  region: AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

const LOCAL_DEST_DIR = path.join(__dirname, '../uploads/legacy-wp');
const MANIFEST_FILE = path.join(__dirname, '../data/wp_pdfs_manifest.json');

async function main() {
  console.log('=== Starting WordPress PDFs Sync to AWS S3 & Local Storage ===');
  console.log(`Target Bucket: ${S3_BUCKET} (${AWS_REGION})`);
  console.log(`Local Directory: ${LOCAL_DEST_DIR}`);

  if (!fs.existsSync(LOCAL_DEST_DIR)) {
    fs.mkdirSync(LOCAL_DEST_DIR, { recursive: true });
  }

  const pdfList = JSON.parse(fs.readFileSync(path.join(__dirname, '../all_165_wp_pdfs.json'), 'utf8'));
  console.log(`Loaded ${pdfList.length} total PDF assets.`);

  const manifest = [];
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < pdfList.length; i++) {
    const item = pdfList[i];
    const originalUrl = item.url;
    // Extract filename from URL (decode %20 etc)
    const urlObj = new URL(originalUrl);
    const pathname = decodeURIComponent(urlObj.pathname);
    const filename = path.basename(pathname);
    const localFilePath = path.join(LOCAL_DEST_DIR, filename);
    const s3Key = `legacy-wp/${filename}`;
    const s3Url = `https://${S3_BUCKET}.s3.${AWS_REGION}.amazonaws.com/${s3Key}`;

    console.log(`\n[${i + 1}/${pdfList.length}] Processing: ${filename}`);

    try {
      // 1. Download file from WP if not already cached locally
      let fileBuffer;
      if (fs.existsSync(localFilePath) && fs.statSync(localFilePath).size > 1000) {
        console.log(`  -> Using local cached copy (${fs.statSync(localFilePath).size} bytes)`);
        fileBuffer = fs.readFileSync(localFilePath);
      } else {
        const res = await fetch(originalUrl, {
          headers: { 'Authorization': 'Basic ' + basicAuth }
        });
        if (!res.ok) {
          throw new Error(`Download failed with status ${res.status}: ${res.statusText}`);
        }
        const arrayBuf = await res.arrayBuffer();
        fileBuffer = Buffer.from(arrayBuf);
        fs.writeFileSync(localFilePath, fileBuffer);
        console.log(`  -> Downloaded ${fileBuffer.length} bytes`);
      }

      // 2. Upload to S3
      await s3Client.send(new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: s3Key,
        Body: fileBuffer,
        ContentType: 'application/pdf',
      }));
      console.log(`  -> Uploaded to S3: ${s3Key}`);

      manifest.push({
        id: item.id,
        title: item.title,
        originalUrl: item.url,
        legacyPath: pathname,
        filename: filename,
        s3Key: s3Key,
        s3Url: s3Url,
        sizeBytes: fileBuffer.length
      });

      successCount++;
    } catch (err) {
      console.error(`  ❌ Error processing ${filename}:`, err.message);
      failCount++;
    }
  }

  // Save manifest
  fs.writeFileSync(MANIFEST_FILE, JSON.stringify(manifest, null, 2));
  console.log(`\n==================================================`);
  console.log(`Sync Finished!`);
  console.log(`Successfully synced: ${successCount}`);
  console.log(`Failed: ${failCount}`);
  console.log(`Manifest saved to: ${MANIFEST_FILE}`);
  console.log(`==================================================`);
}

main().catch(console.error);

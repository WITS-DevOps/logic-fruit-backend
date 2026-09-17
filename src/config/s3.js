import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { S3Client, PutObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { isLocalStorageActive } from "./storageMode.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOADS_ROOT = path.join(__dirname, "../../uploads");

// Check if AWS S3 credentials are configured in .env
export function isS3Configured() {
  return Boolean(
    process.env.AWS_ACCESS_KEY_ID &&
    process.env.AWS_SECRET_ACCESS_KEY &&
    process.env.AWS_S3_BUCKET_NAME
  );
}

// S3 client cache that dynamically refreshes if .env credentials change
let cachedClient = null;
let lastKey = null;
let lastToken = null;

export function getS3Client() {
  if (!isS3Configured()) {
    throw new Error("AWS S3 is not configured. Please check your .env file.");
  }

  const currentKey = process.env.AWS_ACCESS_KEY_ID;
  const currentToken = process.env.AWS_SESSION_TOKEN;

  if (!cachedClient || currentKey !== lastKey || currentToken !== lastToken) {
    const credentials = {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    };
    if (process.env.AWS_SESSION_TOKEN) {
      credentials.sessionToken = process.env.AWS_SESSION_TOKEN;
    }

    cachedClient = new S3Client({
      region: process.env.AWS_REGION || "ap-south-1",
      credentials,
    });
    lastKey = currentKey;
    lastToken = currentToken;
  }

  return cachedClient;
}

/**
 * Helper to recursively list local files
 */
async function getLocalFiles(dir, prefix = "") {
  try {
    const entries = await fs.promises.readdir(dir, { withFileTypes: true });
    let results = [];

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relKey = prefix ? `${prefix}/${entry.name}` : entry.name;

      if (entry.isDirectory()) {
        const subFiles = await getLocalFiles(fullPath, relKey);
        results = results.concat(subFiles);
      } else {
        const stats = await fs.promises.stat(fullPath);
        const alt = entry.name
          .replace(/^\d+-/, "")
          .replace(/\.[^/.]+$/, "")
          .replace(/[-_]/g, " ");

        const port = process.env.PORT || 5000;
        const baseUrl = process.env.BASE_URL || `http://localhost:${port}`;

        results.push({
          key: relKey,
          name: entry.name,
          alt,
          url: `${baseUrl}/uploads/${relKey}`,
          size: stats.size,
          lastModified: stats.mtime,
        });
      }
    }

    return results;
  } catch (error) {
    return [];
  }
}

/**
 * Upload a file buffer (to local disk when USE_LOCAL_STORAGE=true, or AWS S3 when disabled)
 * @param {Object} file - Multer file object
 * @param {string} folder - Target folder (e.g. 'blogs', 'whitepapers', 'images')
 * @returns {Promise<string>} Public URL of the uploaded file
 */
export async function uploadFileToStorage(file, folder = "uploads") {
  const cleanOriginalName = file.originalname.replace(/\s+/g, "-").toLowerCase();
  const uniqueName = `${Date.now()}-${cleanOriginalName}`;

  // 1. Local Storage Mode
  if (isLocalStorageActive()) {
    const targetDir = path.join(UPLOADS_ROOT, folder);
    await fs.promises.mkdir(targetDir, { recursive: true });

    const filePath = path.join(targetDir, uniqueName);
    await fs.promises.writeFile(filePath, file.buffer);

    const port = process.env.PORT || 5000;
    const baseUrl = process.env.BASE_URL || `http://localhost:${port}`;
    return `${baseUrl}/uploads/${folder}/${uniqueName}`;
  }

  // 2. AWS S3 Cloud Storage Mode
  const client = getS3Client();
  const key = `${folder}/${uniqueName}`;
  const bucket = process.env.AWS_S3_BUCKET_NAME;
  const region = process.env.AWS_REGION || "ap-south-1";

  const uploadParams = {
    Bucket: bucket,
    Key: key,
    Body: file.buffer,
    ContentType: file.mimetype,
  };

  await client.send(new PutObjectCommand(uploadParams));

  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
}

/**
 * List files (from local uploads folder when USE_LOCAL_STORAGE=true, or AWS S3 when disabled)
 * @param {string} folder - Folder prefix (e.g. 'images', 'blogs')
 */
export async function listFilesFromStorage(folder = "") {
  // 1. Local Storage Mode
  if (isLocalStorageActive()) {
    const targetDir = folder ? path.join(UPLOADS_ROOT, folder) : UPLOADS_ROOT;
    const items = await getLocalFiles(targetDir, folder);
    return items.sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));
  }

  // 2. AWS S3 Cloud Storage Mode
  const client = getS3Client();
  const bucket = process.env.AWS_S3_BUCKET_NAME;
  const region = process.env.AWS_REGION || "ap-south-1";

  const params = {
    Bucket: bucket,
  };
  if (folder) {
    params.Prefix = folder.endsWith("/") ? folder : `${folder}/`;
  }

  const command = new ListObjectsV2Command(params);
  const data = await client.send(command);

  const items = (data.Contents || [])
    .filter((obj) => obj.Key && !obj.Key.endsWith("/"))
    .map((obj) => {
      const filename = obj.Key.split("/").pop();
      const alt = filename
        .replace(/^\d+-/, "")
        .replace(/\.[^/.]+$/, "")
        .replace(/[-_]/g, " ");
      return {
        key: obj.Key,
        name: filename,
        alt: alt,
        url: `https://${bucket}.s3.${region}.amazonaws.com/${obj.Key}`,
        size: obj.Size,
        lastModified: obj.LastModified,
      };
    })
    .sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));

  return items;
}


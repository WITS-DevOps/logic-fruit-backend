import { S3Client, PutObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Check if AWS S3 credentials are configured in .env
export function isS3Configured() {
  return Boolean(
    process.env.AWS_ACCESS_KEY_ID &&
    process.env.AWS_SECRET_ACCESS_KEY &&
    process.env.AWS_S3_BUCKET_NAME
  );
}

// Create S3 client if configured
let s3Client = null;

if (isS3Configured()) {
  const credentials = {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  };
  if (process.env.AWS_SESSION_TOKEN) {
    credentials.sessionToken = process.env.AWS_SESSION_TOKEN;
  }

  s3Client = new S3Client({
    region: process.env.AWS_REGION || "ap-south-1",
    credentials,
  });
  console.log("☁️  AWS S3 Client initialized");
} else {
  console.log("📁 AWS S3 credentials not found. Using local /uploads folder for testing.");
}

/**
 * Upload a file buffer to AWS S3 or fallback to local disk
 * @param {Object} file - Multer file object
 * @param {string} folder - Target folder inside S3 or local disk (e.g. 'blogs', 'whitepapers')
 * @returns {Promise<string>} Public URL of the uploaded file
 */
export async function uploadFileToStorage(file, folder = "uploads") {
  // Generate a clean, unique file name
  const cleanOriginalName = file.originalname.replace(/\s+/g, "-").toLowerCase();
  const uniqueName = `${Date.now()}-${cleanOriginalName}`;
  const key = `${folder}/${uniqueName}`;

  if (isS3Configured() && s3Client) {
    // Upload to AWS S3
    const bucket = process.env.AWS_S3_BUCKET_NAME;
    const region = process.env.AWS_REGION || "ap-south-1";

    const uploadParams = {
      Bucket: bucket,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    };

    await s3Client.send(new PutObjectCommand(uploadParams));

    // Public S3 URL
    return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
  } else {
    // Local fallback: save file into backend/uploads folder
    const localUploadsDir = path.join(__dirname, "../../uploads", folder);
    if (!fs.existsSync(localUploadsDir)) {
      fs.mkdirSync(localUploadsDir, { recursive: true });
    }

    const localFilePath = path.join(localUploadsDir, uniqueName);
    fs.writeFileSync(localFilePath, file.buffer);

    const port = process.env.PORT || 5000;
    return `http://localhost:${port}/uploads/${folder}/${uniqueName}`;
  }
}

/**
 * List images stored in AWS S3 or fallback local uploads folder
 * @param {string} folder - 'blogs', 'news', 'whitepapers', etc. (or empty for all)
 */
export async function listFilesFromStorage(folder = "") {
  if (isS3Configured() && s3Client) {
    const bucket = process.env.AWS_S3_BUCKET_NAME;
    const region = process.env.AWS_REGION || "ap-south-1";

    const params = {
      Bucket: bucket,
    };
    if (folder) {
      params.Prefix = folder.endsWith("/") ? folder : `${folder}/`;
    }

    const command = new ListObjectsV2Command(params);
    const data = await s3Client.send(command);

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
  } else {
    // Local fallback: scan backend/uploads
    const uploadsBase = path.join(__dirname, "../../uploads");
    const targetDir = folder ? path.join(uploadsBase, folder) : uploadsBase;
    if (!fs.existsSync(targetDir)) {
      return [];
    }

    const port = process.env.PORT || 5000;
    const readDirRecursive = (dir, relPath = "") => {
      let results = [];
      const list = fs.readdirSync(dir, { withFileTypes: true });
      for (const item of list) {
        const itemRel = relPath ? `${relPath}/${item.name}` : item.name;
        const itemFull = path.join(dir, item.name);
        if (item.isDirectory()) {
          results = results.concat(readDirRecursive(itemFull, itemRel));
        } else if (item.isFile() && /\.(jpg|jpeg|png|webp|svg|gif)$/i.test(item.name)) {
          const stat = fs.statSync(itemFull);
          const alt = item.name
            .replace(/^\d+-/, "")
            .replace(/\.[^/.]+$/, "")
            .replace(/[-_]/g, " ");
          results.push({
            key: itemRel,
            name: item.name,
            alt: alt,
            url: `http://localhost:${port}/uploads/${itemRel}`,
            size: stat.size,
            lastModified: stat.mtime,
          });
        }
      }
      return results;
    };

    const items = readDirRecursive(targetDir, folder);
    items.sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));
    return items;
  }
}

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
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
  s3Client = new S3Client({
    region: process.env.AWS_REGION || "ap-south-1",
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
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

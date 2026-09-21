import path from "path";
import express from "express";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { upload } from "../middleware/upload.js";
import {
  uploadFileToStorage,
  listFilesFromStorage,
  isS3Configured,
  getS3Client,
  UPLOADS_ROOT,
} from "../config/s3.js";
import { isLocalStorageActive } from "../config/storageMode.js";

const router = express.Router();

function getStorageType() {
  return isLocalStorageActive() ? "local" : (isS3Configured() ? "s3" : "not_configured");
}

/**
 * @route   GET /api/upload/media/*
 * @desc    Stream uploaded media securely from AWS S3 (or local disk fallback)
 */
router.get("/media/*", async (req, res, next) => {
  try {
    const rawKey = req.params[0];
    if (!rawKey) {
      return res.status(400).send("Media key is required");
    }
    const key = decodeURIComponent(rawKey);

    // 1. Local storage mode fallback
    if (isLocalStorageActive()) {
      const localFilePath = path.join(UPLOADS_ROOT, key);
      return res.sendFile(localFilePath);
    }

    // 2. AWS S3 Cloud Storage
    const client = getS3Client();
    const bucket = process.env.AWS_S3_BUCKET_NAME;

    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    const s3Item = await client.send(command);

    res.setHeader("Content-Type", s3Item.ContentType || "application/octet-stream");
    if (s3Item.ContentLength) {
      res.setHeader("Content-Length", s3Item.ContentLength);
    }
    if (s3Item.ETag) {
      res.setHeader("ETag", s3Item.ETag);
    }
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");

    s3Item.Body.pipe(res);
  } catch (error) {
    if (error.name === "NoSuchKey" || error.$metadata?.httpStatusCode === 404) {
      return res.status(404).send("Media not found");
    }
    next(error);
  }
});

/**
 * @route   POST /api/upload/image
 * @desc    Upload a single image (to S3 or local uploads)
 */
router.post("/image", upload.single("image"), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No image file provided. Please attach a file with key 'image'.",
      });
    }

    const folder = req.body.folder || "images";
    const fileUrl = await uploadFileToStorage(req.file, folder);

    res.status(201).json({
      success: true,
      message: "Image uploaded successfully",
      url: fileUrl,
      storageType: getStorageType(),
      filename: req.file.originalname,
      size: req.file.size,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/upload/pdf
 * @desc    Upload a whitepaper PDF file
 */
router.post("/pdf", upload.single("pdf"), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No PDF file provided. Please attach a file with key 'pdf'.",
      });
    }

    if (req.file.mimetype !== "application/pdf") {
      return res.status(400).json({
        success: false,
        message: "Uploaded file is not a PDF.",
      });
    }

    const folder = req.body.folder || "whitepapers";
    const fileUrl = await uploadFileToStorage(req.file, folder);

    res.status(201).json({
      success: true,
      message: "PDF uploaded successfully",
      url: fileUrl,
      storageType: getStorageType(),
      filename: req.file.originalname,
      size: req.file.size,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/upload/multiple
 * @desc    Upload multiple images (up to 10)
 */
router.post("/multiple", upload.array("images", 10), async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No files provided. Please attach files with key 'images'.",
      });
    }

    const folder = req.body.folder || "gallery";
    const uploadPromises = req.files.map((file) => uploadFileToStorage(file, folder));
    const urls = await Promise.all(uploadPromises);

    res.status(201).json({
      success: true,
      message: "Files uploaded successfully",
      urls: urls,
      storageType: getStorageType(),
      count: urls.length,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/upload/images
 * @desc    List uploaded images from storage (S3 or local uploads folder)
 */
router.get("/images", async (req, res, next) => {
  try {
    const folder = req.query.folder || "";
    const images = await listFilesFromStorage(folder);
    res.json({
      success: true,
      count: images.length,
      images,
      storageType: getStorageType(),
    });
  } catch (error) {
    next(error);
  }
});

export default router;

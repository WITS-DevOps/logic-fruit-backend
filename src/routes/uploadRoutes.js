import express from "express";
import { upload } from "../middleware/upload.js";
import { uploadFileToStorage, listFilesFromStorage, isS3Configured } from "../config/s3.js";
import { isLocalStorageActive } from "../config/storageMode.js";

const router = express.Router();

function getStorageType() {
  return isLocalStorageActive() ? "local" : (isS3Configured() ? "s3" : "not_configured");
}

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

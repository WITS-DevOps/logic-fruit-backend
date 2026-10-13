import multer from "multer";

// Use memory storage so we can send the file buffer directly to S3
const storage = multer.memoryStorage();

// File filter to allow common image types, videos, and PDFs
function fileFilter(req, file, cb) {
  const allowedMimeTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/svg+xml",
    "image/gif",
    "video/mp4",
    "video/webm",
    "video/ogg",
    "video/quicktime",
    "application/pdf",
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only images (.jpg, .png, .webp, .svg), videos (.mp4, .webm, .ogg, .mov) and PDF documents are allowed"), false);
  }
}

// Multer upload instance with a generous 200MB limit (videos and large whitepaper PDFs)
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 200 * 1024 * 1024, // 200MB
  },
});

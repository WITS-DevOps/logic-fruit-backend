// Simple, friendly error handler middleware
export function errorHandler(err, req, res, next) {
  console.error("❌ Error:", err.message);

  // Multer file size error
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({
      success: false,
      message: "File is too large. Maximum allowed size is 50MB.",
    });
  }

  // General error response
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "An unexpected error occurred on the server.",
  });
}

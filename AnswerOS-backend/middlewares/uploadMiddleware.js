const multer = require("multer");

/**
 * MULTER MIDDLEWARE = Memory storage for incoming file uploads
 *
 * Flow:
 *   Receives multipart/form-data -> stores in RAM (req.file.buffer) -> passes to Cloudinary
 */
const storage = multer.memoryStorage();

const uploadMiddleware = multer({
  storage,
  limits: {
    fileSize: 25 * 1024 * 1024, // 25 MB max file size
  },
});

module.exports = { uploadMiddleware };

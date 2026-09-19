const express = require("express");
const { upload } = require("../controllers/documentController");
const { uploadMiddleware } = require("../middlewares/uploadMiddleware");
const { authenticate, authorize } = require("../middlewares/authMiddleware");

const router = express.Router();

// Support both 'doc' and 'file' field names seamlessly
const flexibleUpload = uploadMiddleware.fields([
  { name: "doc", maxCount: 1 },
  { name: "file", maxCount: 1 },
]);

function normalizeUploadedFile(req, res, next) {
  flexibleUpload(req, res, (err) => {
    if (err) return next(err);
    if (req.files) {
      req.file = (req.files["doc"] && req.files["doc"][0]) ||
                 (req.files["file"] && req.files["file"][0]) ||
                 null;
    }
    next();
  });
}

// POST /documents/upload - Strictly Admin-only document ingestion
router.post(
  "/upload",
  authenticate,
  authorize("admin"),
  normalizeUploadedFile,
  upload
);

module.exports = router;
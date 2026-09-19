const { uploadBuffer, FOLDER_NAME } = require("../config/cloudinary");
const { produceDocUploadedMessage } = require("../config/kafka");
const logger = require("../config/logger");

/**
 * UPLOAD = Receive document -> Store in Cloudinary -> Publish job to Kafka
 *
 * Flow:
 *   1. Multer receives file into RAM (req.file.buffer)
 *   2. Upload buffer directly to Cloudinary (permanent storage)
 *   3. Create job metadata (docId, tenantId, cloudinaryUrl, publicId, mimetype)
 *   4. Publish job message to Kafka topic "docs.uploaded"
 *   5. Return 202 Accepted response (RAG Worker processes downstream)
 *
 * Form-data: "doc" file field (plus optional "tenantId" field)
 */
async function upload(req, res) {
  try {
    // Step 1: Validate file input
    if (!req.file) {
      logger.error("API", "Upload request received without file in 'doc' field");
      return res.status(400).json({
        error: "Please upload a file in the 'doc' field (multipart/form-data).",
      });
    }

    const originalName = req.file.originalname || "document";
    const sizeKB = (req.file.size / 1024).toFixed(1);
    logger.api(`Incoming document upload: "${originalName}" (${sizeKB} KB)`);

    // Step 2: Upload file buffer directly from RAM to Cloudinary
    logger.cloudinary(`Uploading buffer to folder "${FOLDER_NAME}"...`);
    const uploadResult = await uploadBuffer(req.file.buffer, {
      folder: FOLDER_NAME,
      resource_type: "auto",
    });
    logger.cloudinary(`Uploaded successfully!`, `URL: ${uploadResult.secure_url} | PublicID: ${uploadResult.public_id}`);

    // Step 3: Build job metadata payload for Kafka
    const docId = req.body.docId || `doc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const tenantId = req.body.tenantId || "default";

    const jobPayload = {
      docId,
      tenantId,
      cloudinaryUrl: uploadResult.secure_url,
      publicId: uploadResult.public_id,
      mimetype: req.file.mimetype || "application/pdf",
    };

    // Step 4: Publish job metadata to Kafka topic "docs.uploaded"
    logger.kafka(`Publishing job to topic "docs.uploaded"...`, `docId: ${docId}, tenantId: ${tenantId}`);
    await produceDocUploadedMessage(jobPayload);
    logger.kafka(`Job queued successfully in Kafka!`, `Partition offset confirmed`);

    // Step 5: Return 202 Accepted response to client with job metadata
    logger.api(`Responding 202 Accepted to client for docId: ${docId}`);
    res.status(202).json({
      ok: true,
      message: "Document uploaded to Cloudinary and queued in Kafka for processing.",
      job: jobPayload,
    });
  } catch (err) {
    logger.error("API", "Error in document upload handler", err.message);
    res.status(500).json({ error: err.message });
  }
}

module.exports = { upload };

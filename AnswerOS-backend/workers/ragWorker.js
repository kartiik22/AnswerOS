require("dotenv").config();

const { kafka, TOPIC_DOCS_UPLOADED } = require("../config/kafka");
const { getVectorStore } = require("../config/rag");
const pdfParse = require("pdf-parse");

const groupId = process.env.KAFKA_GROUP_ID || "rag-worker-group";

// Download file buffer from Cloudinary URL
async function downloadFile(url) {
  const resp = await fetch(url);
  if (!resp.ok) {
    throw new Error(`Failed to download file from ${url}: ${resp.statusText}`);
  }
  const arrayBuffer = await resp.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

// Extract text from document buffer (supports PDF and plain text)
async function extractText(buffer, mimetype = "") {
  const isPdf =
    mimetype.includes("pdf") ||
    (buffer.length >= 4 && buffer.slice(0, 4).toString() === "%PDF");

  if (isPdf) {
    const pdfData = await pdfParse(buffer);
    return pdfData.text;
  }
  return buffer.toString("utf-8");
}

/**
 * Process single document job
 *
 * Flow:
 *   download PDF -> parse PDF -> chunk text -> generate embeddings -> store in Pinecone
 */
const logger = require("../config/logger");

async function processJob(job) {
  const { docId, tenantId, cloudinaryUrl, publicId, mimetype } = job;
  logger.worker(`Received new document job!`, `docId: ${docId} | tenant: ${tenantId}`);

  // Step 1: Download PDF/file from Cloudinary
  logger.cloudinary(`Worker downloading file...`, cloudinaryUrl);
  const buffer = await downloadFile(cloudinaryUrl);
  const sizeKB = (buffer.length / 1024).toFixed(1);
  logger.cloudinary(`Downloaded file successfully (${sizeKB} KB)`);

  // Step 2: Parse document text (PDF or plain text)
  logger.worker(`Extracting text from buffer (mimetype: ${mimetype || "auto"})...`);
  const text = await extractText(buffer, mimetype);

  if (!text?.trim()) {
    logger.error("RAG-WORKER", `docId=${docId} produced empty text content.`);
    return;
  }
  logger.worker(`Extracted ${text.length} characters of readable text.`);

  // Step 3: Chunk text into small pieces with overlap
  const { RecursiveCharacterTextSplitter } = await import(
    "@langchain/textsplitters"
  );
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 500, // ~125 tokens per chunk (3 chunks = ~375 tokens, well under 3k)
    chunkOverlap: 50,
  });

  const metadata = {
    docId,
    tenantId: tenantId || "default",
    source: cloudinaryUrl,
    publicId: publicId || "",
  };

  const chunks = await splitter.createDocuments([text], [metadata]);
  logger.worker(`Split text into ${chunks.length} overlapping chunks.`);

  // Step 4 & 5: Generate embeddings and store vectors in Pinecone
  logger.pinecone(`Embedding ${chunks.length} chunks via Hugging Face & storing in Pinecone index...`);
  const store = await getVectorStore();
  await store.addDocuments(chunks);

  logger.pinecone(`Indexed docId=${docId} (${chunks.length} vectors) in Pinecone successfully!`);
}

/**
 * Start Kafka Consumer Worker
 */
async function startWorker() {
  const consumer = kafka.consumer({ groupId });

  logger.kafka(`Connecting Kafka consumer (group: ${groupId})...`);
  await consumer.connect();

  logger.kafka(`Subscribing to topic: ${TOPIC_DOCS_UPLOADED}`);
  await consumer.subscribe({ topic: TOPIC_DOCS_UPLOADED, fromBeginning: true });

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      const rawValue = message.value.toString();
      try {
        const job = JSON.parse(rawValue);
        logger.kafka(`Message received from topic [${topic}] (partition ${partition})`);
        await processJob(job);
      } catch (err) {
        logger.error("RAG-WORKER", `Error processing message on ${topic}`, err.message);
      }
    },
  });

  logger.worker(`Ready and listening for jobs on "${TOPIC_DOCS_UPLOADED}"`);

  // Graceful shutdown handling (only when worker is run as a standalone process)
  if (require.main === module) {
    const shutdown = async () => {
      logger.kafka("Disconnecting Kafka consumer...");
      await consumer.disconnect();
      process.exit(0);
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  }
}

// Start worker if run directly
if (require.main === module) {
  startWorker().catch((err) => {
    console.error("[Worker] Fatal error running worker:", err);
    process.exit(1);
  });
}

module.exports = { startWorker, processJob };

const { Kafka, logLevel } = require("kafkajs");
const fs = require("fs");

const brokers = process.env.KAFKA_BROKERS
  ? process.env.KAFKA_BROKERS.split(",").map((b) => b.trim())
  : ["localhost:9092"];

const clientId = process.env.KAFKA_CLIENT_ID || "simple-express-server";
const TOPIC_DOCS_UPLOADED = process.env.KAFKA_TOPIC || "docs.uploaded";

// Optional SASL configuration (for cloud providers like Upstash, Confluent, Aiven)
const sasl =
  process.env.KAFKA_SASL_USERNAME && process.env.KAFKA_SASL_PASSWORD
    ? {
        mechanism: (process.env.KAFKA_SASL_MECHANISM || "scram-sha-256").toLowerCase(),
        username: process.env.KAFKA_SASL_USERNAME,
        password: process.env.KAFKA_SASL_PASSWORD,
      }
    : undefined;

// SSL configuration (supports custom CA certificate from file path or env string)
function getSslConfig() {
  const isSslEnabled = process.env.KAFKA_SSL === "true" || !!sasl;
  if (!isSslEnabled) return false;

  let ca;
  if (process.env.KAFKA_CA_CERT) {
    let cert = process.env.KAFKA_CA_CERT.trim();
    cert = cert.replace(/\\n/g, "\n");
    ca = [cert];
  } else if (process.env.KAFKA_CA_CERT_PATH && fs.existsSync(process.env.KAFKA_CA_CERT_PATH)) {
    ca = [fs.readFileSync(process.env.KAFKA_CA_CERT_PATH, "utf-8").trim()];
  }

  if (ca) {
    return {
      rejectUnauthorized: true,
      ca,
    };
  }

  return true;
}

const ssl = getSslConfig();

const kafka = new Kafka({
  clientId,
  brokers,
  ssl,
  sasl,
  logLevel: logLevel.ERROR,
});

const logger = require("./logger");

let producer = null;

async function getProducer() {
  if (!producer) {
    producer = kafka.producer();
    await producer.connect();
    logger.kafka("Producer connected to cluster successfully");
  }
  return producer;
}

// Publish document job metadata (docId, tenantId, cloudinaryUrl, publicId, mimetype) to Kafka
async function produceDocUploadedMessage(payload) {
  const p = await getProducer();
  const record = {
    topic: TOPIC_DOCS_UPLOADED,
    messages: [
      {
        key: payload.docId,
        value: JSON.stringify(payload),
      },
    ],
  };

  const metadata = await p.send(record);
  logger.kafka(`Message sent to topic [${TOPIC_DOCS_UPLOADED}]`, `key: ${payload.docId}`);
  return metadata;
}

module.exports = {
  kafka,
  getProducer,
  produceDocUploadedMessage,
  TOPIC_DOCS_UPLOADED,
};

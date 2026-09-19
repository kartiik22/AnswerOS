require("dotenv").config();

const express = require("express");
const { connectDB } = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const conversationRoutes = require("./routes/conversationRoutes");
const documentRoutes = require("./routes/documentRoutes");
const chatRoutes = require("./routes/chatRoutes");

const app = express();
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// CORS middleware
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

// Root Health Check Route
app.get("/", (req, res) => {
  res.json({ status: "online", service: "AnswerOS API", timestamp: new Date().toISOString() });
});

// Connect to MongoDB safely
connectDB().catch((err) => {
  console.error("MongoDB connection warning:", err.message);
});

// Start Kafka RAG Worker in background if Kafka is configured
if (process.env.KAFKA_BROKERS) {
  try {
    const { startWorker } = require("./workers/ragWorker");
    startWorker().catch((err) => {
      console.warn("RAG Worker warning:", err.message);
    });
  } catch (err) {
    console.warn("Could not initialize worker:", err.message);
  }
}

// Routes
app.use("/auth", authRoutes); // Auth APIs: signup, login, me
app.use("/conversations", conversationRoutes); // Conversation, feedback & analytics APIs
app.use("/documents", documentRoutes); // upload docs
app.use("/chat", chatRoutes); // ask questions

// Global Error Handler
app.use((err, req, res, next) => {
  console.error("Unhandled API error:", err);
  res.status(500).json({ error: err.message || "Internal Server Error" });
});

// Start listening if run directly (or export for serverless function runners)
const PORT = process.env.PORT || 8080;
if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log("Server running on port", PORT);
  });
}

module.exports = app;
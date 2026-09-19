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

// Connect to MongoDB
connectDB();

// Start Kafka RAG Worker automatically in the background
const { startWorker } = require("./workers/ragWorker");
startWorker().catch((err) => {
  console.error("Failed to start background RAG Worker:", err.message);
});

// Routes
app.use("/auth", authRoutes); // Auth APIs: signup, login, me
app.use("/conversations", conversationRoutes); // Conversation, feedback & analytics APIs
app.use("/documents", documentRoutes); // upload docs
app.use("/chat", chatRoutes); // ask questions

app.listen(process.env.PORT || 3000, () => {
  console.log("Server running on port", process.env.PORT || 3000);
});

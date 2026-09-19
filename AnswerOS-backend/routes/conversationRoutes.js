const express = require("express");
const { authenticate, authorize } = require("../middlewares/authMiddleware");
const {
  startConversation,
  endConversation,
  getConversations,
  getMessagesForConversation,
  submitFeedback,
  getDailyAnalytics,
  getFailingDocuments,
} = require("../controllers/conversationController");

const router = express.Router();

// Conversation management (done by CommonUser, admins can view all)
router.post("/start", authenticate, startConversation);           // POST /conversations/start
router.post("/:id/end", authenticate, endConversation);           // POST /conversations/:id/end
router.get("/", authenticate, getConversations);                  // GET /conversations
router.get("/:id/messages", authenticate, getMessagesForConversation); // GET /conversations/:id/messages

// Feedback (submitted by user)
router.post("/feedback", authenticate, submitFeedback);      // POST /conversations/feedback

// Analytics stats & failing documents — Strictly Admin-only
router.get("/analytics/daily", authenticate, authorize("admin"), getDailyAnalytics);               // GET /conversations/analytics/daily
router.get("/analytics/failing-documents", authenticate, authorize("admin"), getFailingDocuments); // GET /conversations/analytics/failing-documents

module.exports = router;

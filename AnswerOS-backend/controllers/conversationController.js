const { Conversation, Message, Feedback, AnalyticsDaily, DocumentAnalytics } = require("../models");

// Get today's date in YYYY-MM-DD format
function getTodayString() {
  return new Date().toISOString().split("T")[0];
}

// POST /conversations/start - Start a new conversation
async function startConversation(req, res) {
  try {
    const userId = req.user.id;

    const conversation = await Conversation.create({
      userId,
      status: "active",
      resolutionType: null,
      messageCount: 0,
    });

    // Update daily analytics
    const date = getTodayString();
    await AnalyticsDaily.findOneAndUpdate(
      { date },
      { $inc: { totalConversations: 1 } },
      { upsert: true, new: true }
    );

    res.status(201).json({
      ok: true,
      message: "Conversation started successfully.",
      conversation,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// POST /conversations/:id/end - End a conversation (accessible by CommonUser)
async function endConversation(req, res) {
  try {
    const { id } = req.params;
    const { status = "resolved", resolutionType = "ai" } = req.body;

    if (!["resolved", "unresolved"].includes(status)) {
      return res.status(400).json({ error: "Status must be 'resolved' or 'unresolved'." });
    }

    const conversation = await Conversation.findById(id);
    if (!conversation) {
      return res.status(404).json({ error: "Conversation not found." });
    }

    // Ensure the common user owns this conversation (or user is admin)
    if (req.user.role === "common" && conversation.userId.toString() !== req.user.id) {
      return res.status(403).json({ error: "Access denied. You can only end your own conversations." });
    }

    conversation.status = status;
    conversation.resolutionType = resolutionType;
    conversation.resolvedAt = new Date();
    await conversation.save();

    // Update daily analytics counters
    const date = getTodayString();
    const incField = status === "resolved" ? { resolvedConversations: 1 } : { unresolvedConversations: 1 };
    await AnalyticsDaily.findOneAndUpdate(
      { date },
      { $inc: incField },
      { upsert: true, returnDocument: "after" }
    );

    res.json({
      ok: true,
      message: `Conversation ended and marked as ${status}.`,
      conversation,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// GET /conversations - List user's conversations
async function getConversations(req, res) {
  try {
    const filter = req.user.role === "admin" ? {} : { userId: req.user.id };
    const conversations = await Conversation.find(filter).sort({ updatedAt: -1 }).limit(50);
    res.json({ ok: true, conversations });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// GET /conversations/:id/messages - Get full message history of a conversation
async function getMessagesForConversation(req, res) {
  try {
    const { id } = req.params;

    const conversation = await Conversation.findById(id);
    if (!conversation) {
      return res.status(404).json({ error: "Conversation not found." });
    }

    // Permission check: common users can only view their own messages
    if (req.user.role === "common" && conversation.userId.toString() !== req.user.id) {
      return res.status(403).json({ error: "Access denied. You can only view your own messages." });
    }

    const messages = await Message.find({ conversationId: id }).sort({ createdAt: 1 });
    res.json({ ok: true, conversation, messages });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// POST /conversations/feedback - Submit feedback (rating 1-5, helpful, hallucination, comment)
async function submitFeedback(req, res) {
  try {
    const { conversationId, messageId, rating, helpful = true, hallucination = false, comment = "" } = req.body;

    if (!conversationId || rating === undefined) {
      return res.status(400).json({ error: "conversationId and rating (1-5) are required." });
    }

    const numRating = Number(rating);
    if (isNaN(numRating) || numRating < 1 || numRating > 5) {
      return res.status(400).json({ error: "Rating must be a number between 1 and 5." });
    }

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ error: "Conversation not found." });
    }

    if (req.user.role === "common" && conversation.userId.toString() !== req.user.id) {
      return res.status(403).json({ error: "Access denied. You can only rate your own conversations." });
    }

    const feedback = await Feedback.create({
      conversationId,
      messageId: messageId || null,
      rating: numRating,
      helpful: !!helpful,
      hallucination: !!hallucination,
      comment,
    });

    // Update daily analytics
    const date = getTodayString();
    const isHallucination = !!hallucination;
    await AnalyticsDaily.findOneAndUpdate(
      { date },
      {
        $inc: {
          totalFeedbacks: 1,
          hallucinationReports: isHallucination ? 1 : 0,
        },
      },
      { upsert: true, returnDocument: "after" }
    );

    // If linked to a message with citations, update document_analytics for failing documents
    if (messageId) {
      const msg = await Message.findById(messageId);
      if (msg && msg.rag && Array.isArray(msg.rag.citations)) {
        const isFailing = numRating <= 2 || isHallucination;
        for (const citation of msg.rag.citations) {
          if (citation.docId) {
            await DocumentAnalytics.findOneAndUpdate(
              { docId: citation.docId },
              {
                $setOnInsert: { source: citation.source || "" },
                $inc: {
                  negativeRatingsCount: numRating <= 2 ? 1 : 0,
                  hallucinationReportsCount: isHallucination ? 1 : 0,
                  failureScore: isFailing ? 1 : 0,
                },
                $set: { lastReportedAt: new Date() },
              },
              { upsert: true, returnDocument: "after" }
            );
          }
        }
      }
    }

    res.status(201).json({
      ok: true,
      message: "Feedback submitted successfully.",
      feedback,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// GET /conversations/analytics/daily - Get daily metrics (Admin or general)
async function getDailyAnalytics(req, res) {
  try {
    const analytics = await AnalyticsDaily.find().sort({ date: -1 }).limit(30);
    res.json({ ok: true, analytics });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// GET /conversations/analytics/failing-documents - Get failing documents
async function getFailingDocuments(req, res) {
  try {
    const failingDocs = await DocumentAnalytics.find({ failureScore: { $gt: 0 } })
      .sort({ failureScore: -1 })
      .limit(50);
    res.json({ ok: true, failingDocs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = {
  startConversation,
  endConversation,
  getConversations,
  getMessagesForConversation,
  submitFeedback,
  getDailyAnalytics,
  getFailingDocuments,
};

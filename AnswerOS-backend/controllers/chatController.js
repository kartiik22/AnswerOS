const { getVectorStore, getChatModel } = require("../config/rag");
const { Conversation, Message, AnalyticsDaily, DocumentAnalytics } = require("../models");

// Helper for today's date
function getTodayString() {
  return new Date().toISOString().split("T")[0];
}

// Step 1: Query Understanding
function analyzeQuery(query) {
  const cleaned = query.trim().replace(/[^\w\s-]/gi, "");
  const keywords = cleaned
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 2);
  return {
    rawQuery: query,
    keywords,
  };
}

// Step 2: Permission Filtering Filter Builder (Single-tenant mode)
function buildFilter(user) {
  // Single-tenant deployment: all users query the main knowledge base
  return undefined;
}

// Step 4: Keyword Search Scoring
function scoreKeywordMatch(text, keywords) {
  if (!keywords || keywords.length === 0 || !text) return 0;
  const lowerText = text.toLowerCase();
  let matches = 0;
  for (const kw of keywords) {
    if (lowerText.includes(kw)) {
      matches += 1;
    }
  }
  return matches / keywords.length;
}

// Step 5 & 6: Hybrid Retrieval & Reranking
function hybridRerank(vectorDocs, keywords, topK = 3) {
  const scoredCandidates = vectorDocs.map((doc, idx) => {
    const vectorScore = 1 / (idx + 1);
    const keywordScore = scoreKeywordMatch(doc.pageContent, keywords);
    const hybridScore = 0.6 * vectorScore + 0.4 * keywordScore;

    return {
      doc,
      hybridScore,
      vectorRank: idx + 1,
      keywordScore,
    };
  });

  scoredCandidates.sort((a, b) => b.hybridScore - a.hybridScore);
  return scoredCandidates.slice(0, topK);
}

// Step 7: Context Construction & Citations
function constructContextWithCitations(reranked) {
  const citations = [];
  const contextParts = [];

  reranked.forEach((item, index) => {
    const citationId = `[${index + 1}]`;
    const doc = item.doc;
    const metadata = doc.metadata || {};

    const citation = {
      citationId,
      docId: metadata.docId || "unknown",
      source: metadata.source || metadata.cloudinaryUrl || "document",
      tenantId: metadata.tenantId || "default",
      score: Number(item.hybridScore.toFixed(3)),
    };
    citations.push(citation);

    contextParts.push(
      `Citation ${citationId} (Source: ${citation.source}):\n${doc.pageContent}`
    );
  });

  return {
    context: contextParts.join("\n\n---\n\n"),
    citations,
  };
}

// Main Chat Controller
async function chat(req, res) {
  const startTime = Date.now();
  try {
    const { message, conversationId: existingConvoId } = req.body;
    const user = req.user; // { id, role, email, tenantId }

    if (!message?.trim()) {
      return res.status(400).json({ error: "Send JSON: { message: '...' }" });
    }

    // Resolve or create Conversation
    let conversation;
    if (existingConvoId) {
      conversation = await Conversation.findById(existingConvoId);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found with the provided conversationId." });
      }

      // Security check: ensure common user cannot post to another user's conversation
      if (user.role === "common" && conversation.userId.toString() !== user.id) {
        return res.status(403).json({ error: "Access denied. This conversation belongs to another user." });
      }

      // Ensure conversation is still active
      if (conversation.status !== "active") {
        return res.status(400).json({ error: `Cannot send message. This conversation is already ${conversation.status}.` });
      }
    } else {
      // If no conversationId is passed, start a new active conversation
      conversation = await Conversation.create({
        userId: user.id,
        status: "active",
        resolutionType: null,
        messageCount: 0,
      });

      // Update daily analytics
      const date = getTodayString();
      await AnalyticsDaily.findOneAndUpdate(
        { date },
        { $inc: { totalConversations: 1 } },
        { upsert: true, returnDocument: "after" }
      );
    }

    // Save user's question message
    const userMsgDoc = await Message.create({
      conversationId: conversation._id,
      senderType: "user",
      content: message,
    });

    // Step 1: Query Understanding
    const { keywords } = analyzeQuery(message);

    // Step 2: Permission Filtering
    const filter = buildFilter(user);

    // Step 3: Vector Search (Pinecone)
    const retrievalStart = Date.now();
    const store = await getVectorStore();
    const vectorDocs = await store.similaritySearch(message, 8, filter);
    const retrievalLatencyMs = Date.now() - retrievalStart;

    let replyContent = "";
    let citations = [];
    let confidence = 0;

    if (!vectorDocs || vectorDocs.length === 0) {
      replyContent = "I couldn't find any documents matching your query with your permission level.";
    } else {
      // Step 4, 5, 6: Keyword Search, Hybrid Retrieval, Reranking
      const rerankedTop3 = hybridRerank(vectorDocs, keywords, 3);
      confidence = rerankedTop3.length > 0 ? rerankedTop3[0].hybridScore : 0;

      // Track document queries in document_analytics
      for (const item of rerankedTop3) {
        const docId = item.doc?.metadata?.docId;
        if (docId) {
          await DocumentAnalytics.findOneAndUpdate(
            { docId },
            {
              $setOnInsert: { source: item.doc?.metadata?.source || "" },
              $inc: { totalQueries: 1 },
              $set: { lastReportedAt: new Date() },
            },
            { upsert: true, new: true }
          );
        }
      }

      // Step 7: Context Construction & Citations
      const constructed = constructContextWithCitations(rerankedTop3);
      citations = constructed.citations;

      // Step 8: Load recent conversation history for memory/continuity
      const { SystemMessage, HumanMessage, AIMessage } = await import("@langchain/core/messages");

      // Fetch up to the last 6 messages from this conversation (before current turn)
      const previousMessages = await Message.find({ conversationId: conversation._id, _id: { $ne: userMsgDoc._id } })
        .sort({ createdAt: -1 })
        .limit(6);
      previousMessages.reverse(); // Chronological order

      const historyMessages = previousMessages.map((m) => {
        if (m.senderType === "ai") return new AIMessage(m.content);
        return new HumanMessage(m.content);
      });

      const systemPrompt =
        `You are an enterprise AI assistant answering questions using retrieved document context and chat history.\n` +
        `User Role: ${user.role}\n\n` +
        `Instructions:\n` +
        `1. Answer the question using ONLY the provided document context below, taking into account any previous conversation history.\n` +
        `2. Reference citations using [1], [2], or [3] whenever stating facts from the context.\n` +
        `3. If the context does not contain enough information, state clearly that you don't know based on the provided documents.\n\n` +
        `Document Context:\n${constructed.context}`;

      const systemMsg = new SystemMessage(systemPrompt);
      const userMsg = new HumanMessage(message);

      // Invoke Groq with System instructions + Prior History + New User Question
      const llm = await getChatModel();
      const reply = await llm.invoke([systemMsg, ...historyMessages, userMsg]);
      replyContent = reply.content;
    }

    // Estimate token metrics
    const inputTokens = Math.ceil((message.length + 300) / 4);
    const outputTokens = Math.ceil(replyContent.length / 4);
    const cost = Number(((inputTokens * 0.0000005) + (outputTokens * 0.0000015)).toFixed(6));

    // Save AI response message
    const aiMsgDoc = await Message.create({
      conversationId: conversation._id,
      senderType: "ai",
      content: replyContent,
      rag: {
        confidence: Number(confidence.toFixed(3)),
        citations,
        retrievalLatencyMs,
        inputTokens,
        outputTokens,
        cost,
      },
    });

    // Update conversation message count
    await Conversation.findByIdAndUpdate(conversation._id, {
      $inc: { messageCount: 2 },
      $set: { updatedAt: new Date() },
    });

    // Update daily analytics
    const date = getTodayString();
    await AnalyticsDaily.findOneAndUpdate(
      { date },
      {
        $inc: {
          totalMessages: 2,
          totalTokens: inputTokens + outputTokens,
          totalCost: cost,
        },
      },
      { upsert: true, returnDocument: "after" }
    );

    // Step 9: Return LLM response with Citations and Message IDs for feedback
    res.json({
      answer: replyContent,
      role: user.role,
      conversationId: conversation._id,
      messageId: aiMsgDoc._id,
      userMessageId: userMsgDoc._id,
      citations,
      rag: {
        confidence: Number(confidence.toFixed(3)),
        retrievalLatencyMs,
        tokens: { inputTokens, outputTokens },
        totalDurationMs: Date.now() - startTime,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { chat };

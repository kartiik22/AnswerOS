import React, { useState, useEffect, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate, useSearchParams } from "react-router-dom";
import { logout, setCredentials } from "../store/authSlice";
import { authAPI, chatAPI, conversationAPI } from "../api/api";
import {
  LogOut,
  Send,
  Sparkles,
  BookOpen,
  ThumbsUp,
  ThumbsDown,
  User,
  Plus,
  MessageSquare,
  Clock,
  ArrowRight,
  ChevronRight,
  HelpCircle,
  Hash,
} from "lucide-react";

export default function UserHomePage() {
  const { user, token } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Current active conversation from URL parameter
  const convoIdFromUrl = searchParams.get("convoId");

  // State
  const [conversationsList, setConversationsList] = useState([]);
  const [loadingConvos, setLoadingConvos] = useState(true);
  const [activeConvoId, setActiveConvoId] = useState(convoIdFromUrl || null);
  const [chatHistory, setChatHistory] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [inputQuery, setInputQuery] = useState("");
  const [sending, setSending] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState({});
  const messagesEndRef = useRef(null);

  // 1. Fetch userdetails on initial page mount (Hits /auth/userdetails)
  useEffect(() => {
    async function loadUserDetails() {
      try {
        const res = await authAPI.getUserDetails();
        if (res.data?.user) {
          const storedToken = localStorage.getItem("token");
          dispatch(
            setCredentials({
              token: storedToken,
              user: res.data.user,
            })
          );
        }
      } catch (err) {
        console.error("Failed to load user details:", err);
        if (err.response?.status === 401) {
          dispatch(logout());
          navigate("/login");
        }
      }
    }
    loadUserDetails();
  }, [dispatch, navigate]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory, sending]);

  // 2. Fetch all user conversations for the sidebar
  const fetchConversations = async () => {
    try {
      setLoadingConvos(true);
      const res = await conversationAPI.getConversations();
      setConversationsList(res.data?.conversations || []);
    } catch (err) {
      console.error("Failed to fetch conversations:", err);
    } finally {
      setLoadingConvos(false);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, []);

  // 3. Keep activeConvoId synced with URL search params
  useEffect(() => {
    setActiveConvoId(convoIdFromUrl || null);
    if (convoIdFromUrl) {
      loadConversationMessages(convoIdFromUrl);
    } else {
      setChatHistory([]);
    }
  }, [convoIdFromUrl]);

  // 4. Load messages for a specific conversation ID
  const loadConversationMessages = async (id) => {
    try {
      setLoadingMessages(true);
      const res = await conversationAPI.getMessages(id);
      const msgs = res.data?.messages || [];
      setChatHistory(
        msgs.map((m) => ({
          sender: m.senderType,
          content: m.content,
          citations: m.rag?.citations || [],
          rag: m.rag || {},
          messageId: m._id,
          conversationId: m.conversationId,
          timestamp: m.createdAt,
        }))
      );
    } catch (err) {
      console.error("Failed to load messages:", err);
    } finally {
      setLoadingMessages(false);
    }
  };

  // 5. Start New Chat Button Handler
  const handleStartNewChat = async () => {
    try {
      const res = await conversationAPI.startConversation();
      const newConvo = res.data?.conversation;
      if (newConvo?._id) {
        setSearchParams({ convoId: newConvo._id });
        setActiveConvoId(newConvo._id);
        setChatHistory([]);
        fetchConversations();
      }
    } catch (err) {
      console.error("Failed to start new conversation:", err);
    }
  };

  // 6. Select an existing conversation from sidebar
  const handleSelectConversation = (id) => {
    setSearchParams({ convoId: id });
  };

  // 7. Send message handler (Uses existing convoId or generates one)
  const handleSendMessage = async (e) => {
    e?.preventDefault();
    if (!inputQuery.trim() || sending) return;

    const userMessage = inputQuery.trim();
    setInputQuery("");
    setSending(true);

    const tempChat = [
      ...chatHistory,
      { sender: "user", content: userMessage, timestamp: new Date() },
    ];
    setChatHistory(tempChat);

    try {
      const res = await chatAPI.sendMessage({
        message: userMessage,
        conversationId: activeConvoId || undefined,
      });

      const data = res.data;
      if (data.conversationId && data.conversationId !== activeConvoId) {
        setActiveConvoId(data.conversationId);
        setSearchParams({ convoId: data.conversationId });
        fetchConversations();
      }

      setChatHistory([
        ...tempChat,
        {
          sender: "ai",
          content: data.answer,
          citations: data.citations || [],
          rag: data.rag || {},
          messageId: data.messageId,
          conversationId: data.conversationId,
          timestamp: new Date(),
        },
      ]);
    } catch (err) {
      setChatHistory([
        ...tempChat,
        {
          sender: "ai",
          content: `Error: ${
            err.response?.data?.error || "Failed to communicate with RAG server."
          }`,
          isError: true,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  const handleFeedback = async (messageId, convoId, rating, isHallucination = false) => {
    try {
      await conversationAPI.submitFeedback({
        conversationId: convoId,
        messageId: messageId,
        rating: rating,
        isHallucination: isHallucination,
      });
      setFeedbackSuccess((prev) => ({ ...prev, [messageId]: rating }));
    } catch (err) {
      console.error("Feedback error:", err);
    }
  };

  const handleLogout = () => {
    dispatch(logout());
    navigate("/login");
  };

  return (
    <div className="user-portal-root">
      {/* Top Header */}
      <header className="navbar">
        <div className="nav-brand">
          <div className="nav-badge-user">USER PORTAL</div>
          <span className="brand-text">Enterprise Knowledge Assistant</span>
        </div>
        <div className="nav-profile">
          <div className="user-pill">
            <User size={16} />
            <span className="user-email">{user?.email || "User"}</span>
            <span className="tenant-tag">{user?.tenantId || "default"}</span>
          </div>
          <button onClick={handleLogout} className="btn-logout" title="Sign Out">
            <LogOut size={16} />
            <span>Logout</span>
          </button>
        </div>
      </header>

      {/* Portal Layout: Sidebar + Main Area */}
      <div className="portal-main-layout">
        {/* Left Sidebar: Conversations list */}
        <aside className="chat-sidebar">
          <button onClick={handleStartNewChat} className="btn-new-chat">
            <Plus size={18} />
            <span>Start New Chat</span>
          </button>

          <div className="sidebar-section-title">
            <MessageSquare size={14} />
            <span>Your Conversations ({conversationsList.length})</span>
          </div>

          <div className="conversations-scroll">
            {loadingConvos ? (
              <div className="sidebar-loading">Loading conversations...</div>
            ) : conversationsList.length === 0 ? (
              <div className="sidebar-empty">No conversations yet.</div>
            ) : (
              conversationsList.map((convo) => {
                const isActive = convo._id === activeConvoId;
                const formattedDate = new Date(convo.updatedAt || convo.createdAt).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                });

                return (
                  <div
                    key={convo._id}
                    onClick={() => handleSelectConversation(convo._id)}
                    className={`convo-list-item ${isActive ? "active" : ""}`}
                  >
                    <div className="convo-item-header">
                      <Hash size={14} className="convo-hash" />
                      <span className="convo-id-text">
                        {`convo_${convo._id.slice(-6)}`}
                      </span>
                      <span className={`convo-status ${convo.status}`}>{convo.status}</span>
                    </div>
                    <div className="convo-item-footer">
                      <span>{convo.messageCount || 0} messages</span>
                      <span>{formattedDate}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </aside>

        {/* Right Main Area */}
        <main className="chat-main-area">
          {!activeConvoId ? (
            /* Welcome screen with Start Chat CTA */
            <div className="welcome-chat-hero">
              <div className="hero-icon-bubble">
                <Sparkles size={48} />
              </div>
              <h1 className="hero-title">Welcome, {user?.name || "Explorer"}!</h1>
              <p className="hero-subtitle">
                Access your organization's indexed knowledge base securely. Start a new dialogue or pick an existing conversation from the sidebar.
              </p>
              <div className="hero-meta">
                <div className="meta-badge">Tenant: {user?.tenantId || "default"}</div>
                <div className="meta-badge">Role: {user?.role || "common"}</div>
              </div>
              <button onClick={handleStartNewChat} className="btn-hero-start">
                <Plus size={20} />
                <span>Start Chat</span>
                <ArrowRight size={18} />
              </button>
            </div>
          ) : (
            /* Active Conversation View */
            <div className="active-chat-wrapper">
              <div className="chat-header-bar">
                <div className="convo-current-info">
                  <span className="active-tag">Active Conversation</span>
                  <code className="active-id">{activeConvoId}</code>
                </div>
                <button
                  onClick={handleStartNewChat}
                  className="btn-header-new"
                  title="Create new session"
                >
                  <Plus size={16} /> New Session
                </button>
              </div>

              <div className="chat-messages-scroll">
                {loadingMessages ? (
                  <div className="empty-state">
                    <Clock size={36} className="empty-icon spin" />
                    <p>Loading messages...</p>
                  </div>
                ) : chatHistory.length === 0 ? (
                  <div className="empty-state">
                    <Sparkles size={36} className="empty-icon" />
                    <h3>New Conversation Ready</h3>
                    <p>Ask any question based on your tenant's indexed documents.</p>
                  </div>
                ) : (
                  chatHistory.map((item, index) => (
                    <div
                      key={index}
                      className={`chat-message ${
                        item.sender === "user" ? "user-msg" : "ai-msg"
                      }`}
                    >
                      <div className="msg-header">
                        <strong>{item.sender === "user" ? "You" : "Enterprise AI"}</strong>
                        {item.rag?.confidence && (
                          <span className="confidence-tag">
                            Confidence: {(item.rag.confidence * 100).toFixed(0)}%
                          </span>
                        )}
                      </div>
                      <div className="msg-content">{item.content}</div>

                      {/* Citations */}
                      {item.citations && item.citations.length > 0 && (
                        <div className="citations-wrapper">
                          <div className="citations-title">
                            <BookOpen size={14} /> Retrieved Sources ({item.citations.length}):
                          </div>
                          <div className="citations-list">
                            {item.citations.map((c, i) => (
                              <div key={i} className="citation-pill">
                                <span className="citation-badge">{c.citationId}</span>
                                <span className="citation-url" title={c.source}>
                                  {c.source.length > 50 ? c.source.slice(0, 50) + "..." : c.source}
                                </span>
                                <span className="citation-score">Score: {c.score}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Feedback buttons */}
                      {item.sender === "ai" && item.messageId && (
                        <div className="feedback-bar">
                          <span className="feedback-label">Was this response helpful?</span>
                          <button
                            className={`btn-rate ${feedbackSuccess[item.messageId] === 5 ? "active-like" : ""}`}
                            onClick={() => handleFeedback(item.messageId, activeConvoId, 5)}
                          >
                            <ThumbsUp size={14} /> Helpful
                          </button>
                          <button
                            className={`btn-rate ${feedbackSuccess[item.messageId] === 1 ? "active-dislike" : ""}`}
                            onClick={() => handleFeedback(item.messageId, activeConvoId, 1, true)}
                          >
                            <ThumbsDown size={14} /> Inaccurate
                          </button>
                          {feedbackSuccess[item.messageId] && (
                            <span className="feedback-done">✓ Recorded</span>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                )}
                {sending && (
                  <div className="chat-message ai-msg loading-msg">
                    <span className="pulsing-dot"></span> Generating answer with vector context...
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input */}
              <form onSubmit={handleSendMessage} className="chat-input-bar">
                <input
                  type="text"
                  placeholder="Ask a question about your documents..."
                  value={inputQuery}
                  onChange={(e) => setInputQuery(e.target.value)}
                />
                <button type="submit" disabled={sending || !inputQuery.trim()} className="btn-send">
                  <Send size={18} />
                  <span>Send</span>
                </button>
              </form>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

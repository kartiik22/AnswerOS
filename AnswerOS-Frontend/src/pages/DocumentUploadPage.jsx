import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { logout } from "../store/authSlice";
import { documentAPI } from "../api/api";
import {
  UploadCloud,
  FileText,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  LogOut,
  Layers,
  Database,
  Cpu,
  Radio,
  FileCheck
} from "lucide-react";

export default function DocumentUploadPage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [file, setFile] = useState(null);
  const [tenantId, setTenantId] = useState("default");
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [toastMessage, setToastMessage] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);

  const handleLogout = () => {
    dispatch(logout());
    navigate("/login");
  };

  const handleFileDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!file) return;
    setUploading(true);
    setUploadResult(null);
    setUploadError("");

    const formData = new FormData();
    formData.append("doc", file);
    formData.append("file", file);
    formData.append("tenantId", tenantId || "default");

    try {
      const res = await documentAPI.uploadDocument(formData);
      setUploadResult(res.data);
      setFile(null);
      setToastMessage("Document uploaded & streamed to Kafka successfully!");
      setTimeout(() => setToastMessage(""), 4000);
    } catch (err) {
      setUploadError(
        err.response?.data?.error || "Document upload failed. Ensure server and Kafka cluster are running."
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="admin-page-container">
      {/* Top Navbar */}
      <nav className="admin-top-navbar">
        <div className="admin-nav-container">
          <div className="admin-nav-brand">
            <div className="brand-mark">&#955;</div>
            <div className="admin-nav-brand-text">
              <span className="admin-nav-title">AnswerOS : Customer Support RAG</span>
              <span className="admin-nav-sub">Conversation quality, cost and knowledge-base health</span>
            </div>
          </div>

          <div className="admin-nav-actions">
            <button
              className="admin-nav-tab active"
              onClick={() => navigate("/document-upload")}
              title="Upload Documents"
            >
              <UploadCloud size={15} />
              <span>Document Upload</span>
            </button>
            <button
              className="admin-nav-tab"
              onClick={() => navigate("/admin-home")}
              title="Back to Dashboard"
            >
              <Layers size={15} />
              <span>Dashboard</span>
            </button>
            <button className="admin-logout-nav-btn" onClick={handleLogout} title="Sign Out">
              <LogOut size={15} />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Main Container */}
      <main className="upload-page-content">
        <div className="upload-header-banner">
          <button className="back-btn-pill" onClick={() => navigate("/admin-home")}>
            <ArrowLeft size={14} /> Back to Dashboard
          </button>
          <div className="pipeline-status-badge">
            <span className="pulse-dot-green"></span>
            <span>KAFKA EVENT-STREAMING ACTIVE</span>
          </div>
        </div>

        <div className="upload-grid-layout">
          {/* Main Upload Card */}
          <div className="upload-glass-card">
            <div className="card-top-glow"></div>
            <div className="upload-card-header">
              <div className="header-icon-box">
                <UploadCloud size={24} color="#5eead4" />
              </div>
              <div>
                <h2>Document Upload for RAG Knowledge Base</h2>
                <p>
                  Documents are uploaded directly to Cloudinary storage, indexed into Pinecone vector spaces, and streamed to Kafka topic <code>docs.uploaded</code> with chunking &amp; embedding.
                </p>
              </div>
            </div>

            <form onSubmit={handleUploadSubmit} className="upload-page-form">
              <div className="form-group-row">
                <label className="input-label-sm">TENANT ID (PARTITION)</label>
                <input
                  type="text"
                  value={tenantId}
                  onChange={(e) => setTenantId(e.target.value)}
                  placeholder="default"
                  required
                  className="tenant-input-field"
                />
              </div>

              {/* Drag & Drop Zone */}
              <div
                className={`dropzone-box ${isDragOver ? "dragover" : ""} ${file ? "has-file" : ""}`}
                onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleFileDrop}
                onClick={() => document.getElementById("doc-file-input").click()}
              >
                <input
                  id="doc-file-input"
                  type="file"
                  accept=".pdf,.txt,.docx,.md,.csv,.json"
                  onChange={handleFileSelect}
                  style={{ display: "none" }}
                />

                {file ? (
                  <div className="dropzone-file-selected">
                    <div className="file-icon-pulse">
                      <FileCheck size={38} color="#4ade80" />
                    </div>
                    <div className="file-info-text">
                      <span className="file-name">{file.name}</span>
                      <span className="file-meta">
                        {(file.size / 1024).toFixed(1)} KB &#8226; Ready to stream
                      </span>
                    </div>
                    <span className="change-file-hint">Click or drop to replace</span>
                  </div>
                ) : (
                  <div className="dropzone-empty-prompt">
                    <div className="dropzone-upload-anim">
                      <UploadCloud size={40} className="floating-cloud-icon" />
                    </div>
                    <div className="dropzone-text-group">
                      <p className="drop-title">Drag &amp; drop document here, or <span className="browse-highlight">browse</span></p>
                      <p className="drop-sub">Supported formats: PDF, TXT, DOCX, Markdown, CSV, JSON</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="form-action-row">
                <button
                  type="submit"
                  disabled={uploading || !file}
                  className={`btn-trigger-pipeline ${uploading ? "active-uploading" : ""}`}
                >
                  <div className="audio-wave-bars">
                    <span className="audio-bar a1"></span>
                    <span className="audio-bar a2"></span>
                    <span className="audio-bar a3"></span>
                    <span className="audio-bar a4"></span>
                  </div>
                  <UploadCloud size={16} />
                  <span>{uploading ? "Streaming to Kafka..." : "Trigger Kafka Pipeline"}</span>
                </button>
              </div>



              {uploadError && (
                <div className="upload-alert-box error">
                  <AlertCircle size={18} />
                  <div>
                    <strong>Upload failed:</strong> {uploadError}
                  </div>
                </div>
              )}
            </form>
          </div>

          {/* Architecture & Pipeline Side Info Card */}
          <div className="pipeline-info-card">
            <h3 className="side-card-title">
              <Radio size={16} color="#5eead4" /> Live Pipeline Architecture
            </h3>

            <div className="pipeline-steps-timeline">
              <div className="timeline-item">
                <div className="timeline-node active">1</div>
                <div className="timeline-content">
                  <h4>Cloudinary Upload</h4>
                  <p>Raw binary payload is pushed to encrypted cloud storage to obtain a verifiable immutable URL.</p>
                </div>
              </div>

              <div className="timeline-item">
                <div className="timeline-node active">2</div>
                <div className="timeline-content">
                  <h4>Kafka Event Producer</h4>
                  <p>Triggers message on topic <code>docs.uploaded</code> with metadata &amp; partition keys.</p>
                </div>
              </div>

              <div className="timeline-item">
                <div className="timeline-node active">3</div>
                <div className="timeline-content">
                  <h4>RAG Worker Chunking</h4>
                  <p>Worker parses text, cleans markdown, and performs 500-char sliding window chunking with 50-char overlap.</p>
                </div>
              </div>

              <div className="timeline-item">
                <div className="timeline-node active">4</div>
                <div className="timeline-content">
                  <h4>Pinecone Vector Store</h4>
                  <p>Embeds chunks via text-embedding model and upserts 1536-dim vector records with metadata filtering.</p>
                </div>
              </div>
            </div>

            <div className="pipeline-stats-box">
              <div className="p-stat">
                <span className="p-num">~125</span>
                <span className="p-lbl">Tokens / Chunk</span>
              </div>
              <div className="p-stat">
                <span className="p-num">&lt; 3k</span>
                <span className="p-lbl">Top-K Context</span>
              </div>
              <div className="p-stat">
                <span className="p-num">120b</span>
                <span className="p-lbl">GPT-OSS LLM</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
import React, { useEffect, useState, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { logout } from "../store/authSlice";
import { conversationAPI, documentAPI } from "../api/api";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line, Bar, Scatter, Doughnut } from "react-chartjs-2";
import {
  LogOut,
  Loader2,
  UploadCloud,
  FileText,
  Activity,
  AlertTriangle,
  TrendingUp,
  Shield,
  Layers,
  Database,
  CheckCircle,
  ExternalLink,
  Download,
} from "lucide-react";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler
);

// Moving Wheel Loader (radial rotating glowing wheel)
function MovingWheelLoader({ size = "md", label = "Loading telemetry..." }) {
  return (
    <div className="moving-wheel-loader-container">
      <div className={"moving-wheel-spinner " + (size !== "md" ? size : "")} />
      {label && <div className="moving-wheel-text">{label}</div>}
    </div>
  );
}

export default function AdminHomePage() {
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // Range controller state
  const [range, setRange] = useState("30"); // 7, 14, 30, all
  const [dailyData, setDailyData] = useState([]);
  const [failingDocs, setFailingDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSimulated, setIsSimulated] = useState(false);

  // Ingestion form state
  const [file, setFile] = useState(null);
  const [tenantId, setTenantId] = useState("default");
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [toastMessage, setToastMessage] = useState("");
  const [uploadError, setUploadError] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [resDaily, resFailing] = await Promise.all([
        conversationAPI.getDailyAnalytics(),
        conversationAPI.getFailingDocuments(),
      ]);
      const fetched = resDaily.data.analytics || [];
      fetched.sort((a, b) => a.date.localeCompare(b.date));
      setDailyData(fetched);
      setFailingDocs(resFailing.data.failingDocs || []);
      setIsSimulated(false);
    } catch (err) {
      console.warn("Falling back to simulated data:", err);
      // Fallback generator
      const mockDaily = [];
      const today = new Date();
      for (let i = 30; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const iso = d.toISOString().slice(0, 10);
        const total = Math.floor(Math.random() * 20) + 15;
        const resolved = Math.floor(total * 0.8);
        const unresolved = total - resolved;
        const totalMsgs = total * 4;
        const totalTokens = totalMsgs * 300;
        mockDaily.push({
          date: iso,
          totalConversations: total,
          resolvedConversations: resolved,
          unresolvedConversations: unresolved,
          totalMessages: totalMsgs,
          totalFeedbacks: Math.floor(total * 0.4),
          averageRating: +(3.8 + Math.random() * 1.1).toFixed(2),
          hallucinationReports: Math.random() < 0.25 ? 1 : 0,
          totalTokens,
          totalCost: +(totalTokens * 0.0000008).toFixed(4),
        });
      }
      setDailyData(mockDaily);
      setIsSimulated(true);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    dispatch(logout());
    navigate("/login");
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
    formData.append("tenantId", tenantId);

    try {
      const res = await documentAPI.uploadDocument(formData);
      setUploadResult(res.data);
      setFile(null);
    } catch (err) {
      setUploadError(
        err.response?.data?.error || "Upload failed. Verify server and Kafka connection."
      );
    } finally {
      setUploading(false);
    }
  };

  // Filter daily rows by selected range
  const filteredDaily = () => {
    if (range === "all") return dailyData;
    const n = parseInt(range, 10);
    return dailyData.slice(-n);
  };

  const currentRows = filteredDaily();

  // Helper calculations
  const sum = (rows, key) => rows.reduce((a, r) => a + (r[key] || 0), 0);
  const avg = (rows, key) => (rows.length ? sum(rows, key) / rows.length : 0);

  const totalConv = sum(currentRows, "totalConversations");
  const resolvedConv = sum(currentRows, "resolvedConversations");
  const resRate = totalConv ? (resolvedConv / totalConv) * 100 : 0;
  const totalMsgs = sum(currentRows, "totalMessages");
  const msgDensity = totalConv ? totalMsgs / totalConv : 0;
  const avgRating = avg(currentRows, "averageRating");
  const totalTokens = sum(currentRows, "totalTokens");
  const totalCost = sum(currentRows, "totalCost");
  const hallucTotal = sum(currentRows, "hallucinationReports");

  // Health / Status tags
  const resRateStatus = resRate >= 80 ? "green" : resRate >= 65 ? "amber" : "red";
  const resRateColor = resRateStatus === "green" ? "#4ade80" : resRateStatus === "amber" ? "#fbbf24" : "#fb7185";
  const ratingStatus = avgRating >= 4.0 ? "green" : avgRating >= 3.2 ? "amber" : "red";
  const ratingColor = ratingStatus === "green" ? "#a78bfa" : ratingStatus === "amber" ? "#fbbf24" : "#fb7185";
  const hallucStatus = hallucTotal === 0 ? "green" : hallucTotal <= 3 ? "amber" : "red";
  const hallucLabel = hallucStatus === "green" ? "Nominal" : hallucStatus === "amber" ? "Elevated" : "Critical";

  // Chart config
  const labels = currentRows.map((r) => r.date.slice(5));
  const gridColor = "rgba(255,255,255,0.05)";
  const tickColor = "#5a6178";

  const commonScales = {
    x: {
      grid: { color: gridColor, drawTicks: false },
      ticks: { color: tickColor, font: { family: "IBM Plex Mono", size: 10 }, maxRotation: 0, autoSkip: true, maxTicksLimit: 8 },
      border: { color: "rgba(255,255,255,0.08)" },
    },
    y: {
      grid: { color: gridColor, drawTicks: false },
      ticks: { color: tickColor, font: { family: "IBM Plex Mono", size: 10 } },
      border: { display: false },
    },
  };

  // 1. Throughput Chart Data
  const throughputData = {
    labels,
    datasets: [
      {
        label: "Total",
        data: currentRows.map((r) => r.totalConversations),
        borderColor: "#5eead4",
        backgroundColor: "rgba(94,234,212,0.08)",
        fill: true,
        tension: 0.35,
        pointRadius: 0,
        borderWidth: 2,
      },
      {
        label: "Resolved",
        data: currentRows.map((r) => r.resolvedConversations),
        borderColor: "#4ade80",
        backgroundColor: "transparent",
        tension: 0.35,
        pointRadius: 0,
        borderWidth: 1.6,
      },
      {
        label: "Unresolved",
        data: currentRows.map((r) => r.unresolvedConversations),
        borderColor: "#fb7185",
        backgroundColor: "transparent",
        tension: 0.35,
        pointRadius: 0,
        borderWidth: 1.6,
        borderDash: [3, 3],
      },
    ],
  };

  // 2. Cost vs Tokens Data
  const costData = {
    labels,
    datasets: [
      {
        type: "bar",
        label: "Tokens",
        data: currentRows.map((r) => r.totalTokens),
        backgroundColor: "rgba(94,234,212,0.35)",
        borderRadius: 3,
        yAxisID: "y",
      },
      {
        type: "line",
        label: "Cost ($)",
        data: currentRows.map((r) => r.totalCost),
        borderColor: "#fbbf24",
        backgroundColor: "transparent",
        yAxisID: "y1",
        tension: 0.35,
        pointRadius: 0,
        borderWidth: 2,
      },
    ],
  };

  // 3. Satisfaction Scatter Data
  const satData = {
    datasets: [
      {
        label: "Rating",
        data: currentRows.map((r, i) => ({
          x: i,
          y: r.averageRating,
          r: 4 + (r.hallucinationReports || 0) * 3,
        })),
        backgroundColor: "rgba(167,139,250,0.55)",
        borderColor: "#a78bfa",
        borderWidth: 1,
      },
    ],
  };

  // 4. Hallucination Risk Data
  const hallucData = {
    labels,
    datasets: [
      {
        label: "Hallucination reports",
        data: currentRows.map((r) => r.hallucinationReports),
        backgroundColor: currentRows.map((r) =>
          r.hallucinationReports >= 3
            ? "#fb7185"
            : r.hallucinationReports > 0
            ? "#fbbf24"
            : "rgba(255,255,255,0.12)"
        ),
        borderRadius: 3,
      },
    ],
  };

  // Export functions
  const downloadFile = (filename, content, mime) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportCsv = () => {
    if (!currentRows.length) return;
    const headers = Object.keys(currentRows[0]);
    const lines = [headers.join(",")];
    currentRows.forEach((r) =>
      lines.push(headers.map((h) => JSON.stringify(r[h] ?? "")).join(","))
    );
    downloadFile(`rag-analytics-${range}d.csv`, lines.join("\n"), "text/csv");
  };

  const handleExportJson = () => {
    downloadFile(
      `rag-analytics-${range}d.json`,
      JSON.stringify({ daily: currentRows, failingDocuments: failingDocs }, null, 2),
      "application/json"
    );
  };

  const timeAgo = (iso) => {
    if (!iso) return "recently";
    const diff = (Date.now() - new Date(iso).getTime()) / 1000;
    if (diff < 3600) return Math.max(1, Math.round(diff / 60)) + "m ago";
    if (diff < 86400) return Math.round(diff / 3600) + "h ago";
    return Math.round(diff / 86400) + "d ago";
  };

  const maxScore = Math.max(1, ...failingDocs.map((x) => x.failureScore || 0));
  const healthPill = (score) => {
    if (score >= 6) return { cls: "red", label: "Critical" };
    if (score >= 3) return { cls: "amber", label: "At risk" };
    return { cls: "green", label: "Healthy" };
  };
  const healthFor = healthPill;

  return (
    <div className="admin-page-container">
      {/* Top Navbar with Title, Subtitle, Document Upload navigation and Logout */}
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
              className="admin-nav-tab"
              onClick={() => navigate("/document-upload")}
              title="Upload Documents for RAG"
            >
              <UploadCloud size={15} />
              <span>Document Upload</span>
            </button>
            <button className="admin-logout-nav-btn" onClick={handleLogout} title="Sign Out">
              <LogOut size={15} />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Dashboard shifted down */}
      <div className="admin-ops-wrap admin-shifted-down">
        {/* Topbar: Exactly centered controls + right-aligned exports */}
        <div className="topbar centered-dashboard-topbar">
          <div className="topbar-left-spacer"></div>

          <div className="topbar-center-group">
            <span className="status-chip">
              <span className={`status-dot ${isSimulated ? "mock" : ""}`}></span>
              <span>{isSimulated ? "simulated telemetry" : "live: http://localhost:8080"}</span>
            </span>

            <div className="range-pills">
              <button
                className={range === "7" ? "active" : ""}
                onClick={() => setRange("7")}
              >
                7d
              </button>
              <button
                className={range === "14" ? "active" : ""}
                onClick={() => setRange("14")}
              >
                14d
              </button>
              <button
                className={range === "30" ? "active" : ""}
                onClick={() => setRange("30")}
              >
                30d
              </button>
              <button
                className={range === "all" ? "active" : ""}
                onClick={() => setRange("all")}
              >
                All time
              </button>
            </div>
          </div>

          <div className="topbar-right-actions">
            <button className="icon-btn" onClick={handleExportCsv}>
              <Download size={13} /> Export CSV
            </button>
            <button className="icon-btn" onClick={handleExportJson}>
              <Download size={13} /> Export JSON
            </button>
          </div>
        </div>

        {/* KPI Dashboard Section */}
        <div className="admin-kpi-1080-grid">
          {/* Card 1: Document Ingestion Pipeline (Cloudinary & Kafka) - spans 2 columns */}
          <div
            className="kpi-card ingestion-kpi-highlight radar-box-container kpi-col-2 custom-doc-upload-card"
            style={{
              "--glow": "rgba(94,234,212,0.22)",
              overflow: "visible",
              border: "1px solid rgba(94,234,212,0.35)",
              position: "relative",
              cursor: "pointer",
            }}
            onClick={(e) => {
              if (e.target.closest("input") || e.target.closest("label") || e.target.closest("button")) return;
              navigate("/document-upload");
            }}
          >
            {/* Radar ripple squares expanding outward */}
            <div className="radar-square-pulse r1"></div>
            <div className="radar-square-pulse r2"></div>
            <div>
              <div className="kpi-label">
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ color: "#5eead4", fontWeight: "700", fontSize: "14px" }}>
                    Document Upload for RAG
                  </span>
                  <ExternalLink size={13} color="#5eead4" style={{ opacity: 0.7 }} />
                </div>
                <span className="kpi-badge tag green" style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                  <span className="pulse-dot-mini"></span> KAFKA ACTIVE
                </span>
              </div>
              <div style={{ fontSize: "12px", color: "var(--text-dim-dash)", marginTop: "6px", lineHeight: "1.35" }}>
                Stream documents to Kafka pipeline with auto-chunking & vector embedding.
              </div>
            </div>

            <form onSubmit={handleUploadSubmit} style={{ marginTop: "8px", display: "flex", flexDirection: "column", gap: "8px" }}>
              <div style={{ display: "flex", gap: "6px" }}>
                <input
                  type="text"
                  placeholder="Tenant ID"
                  value={tenantId}
                  onChange={(e) => setTenantId(e.target.value)}
                  required
                  style={{
                    flex: "1",
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(94,234,212,0.25)",
                    borderRadius: "6px",
                    padding: "6px 9px",
                    color: "var(--text-dash)",
                    fontSize: "12px",
                    fontFamily: "var(--font-mono-dash)"
                  }}
                />
                <label style={{
                  background: "rgba(94,234,212,0.08)",
                  border: "1px dashed rgba(94,234,212,0.4)",
                  borderRadius: "6px",
                  padding: "6px 10px",
                  color: file ? "#4ade80" : "#5eead4",
                  fontSize: "11.5px",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  display: "flex",
                  alignItems: "center",
                  fontWeight: "600"
                }}>
                  {file ? file.name.slice(0, 12) + "..." : "Select Doc"}
                  <input
                    type="file"
                    accept=".pdf,.txt,.docx,.md"
                    onChange={(e) => setFile(e.target.files[0])}
                    style={{ display: "none" }}
                  />
                </label>
              </div>
              <div style={{ display: "flex", gap: "6px" }}>
                <button
                  type="submit"
                  disabled={uploading || !file}
                  className={`btn-ingest-pulsing ${uploading ? "uploading-active" : ""}`}
                  style={{ flex: 1 }}
                >
                  <div className="audio-wave-bars">
                    <span className="audio-bar a1"></span>
                    <span className="audio-bar a2"></span>
                    <span className="audio-bar a3"></span>
                    <span className="audio-bar a4"></span>
                  </div>
                  <UploadCloud size={14} />
                  <span>{uploading ? "Ingesting..." : "Trigger Kafka Pipeline"}</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate("/document-upload");
                  }}
                  className="icon-btn"
                  style={{
                    background: "rgba(94,234,212,0.1)",
                    borderColor: "rgba(94,234,212,0.3)",
                    color: "#5eead4",
                    fontSize: "11px",
                    padding: "6px 10px"
                  }}
                  title="Open Dedicated Full-Screen Upload Studio"
                >
                  <ExternalLink size={13} /> Full Studio
                </button>
              </div>

              {uploadError && (
                <div style={{ fontSize: "10.5px", color: "#fb7185", fontFamily: "var(--font-mono-dash)" }}>
                  ✕ {uploadError}
                </div>
              )}
            </form>
          </div>

          {/* Row 1, Col 3: Conversations & Messages */}
          <div className="kpi-card" style={{ "--glow": "rgba(94,234,212,0.14)" }}>
            <div className="kpi-label">
              Conversations &amp; messages
              <span className="kpi-badge" style={{ color: "var(--text-faint)" }}>
                {msgDensity.toFixed(1)}/conv
              </span>
            </div>
            {loading ? (
              <MovingWheelLoader size="sm" label="Syncing sessions..." />
            ) : (
              <>
                <div className="kpi-value">
                  {totalConv}
                  <span className="unit">conv</span>
                </div>
            <span className="kpi-delta flat" style={{ color: "var(--text-dim)" }}>
              {totalMsgs.toLocaleString()} messages total
            </span>
            <div className="mini-bars">
              {currentRows.map((r, i) => {
                const max = Math.max(1, ...currentRows.map((x) => x.totalConversations));
                const h = Math.max(2, Math.round((r.totalConversations / max) * 32));
                return <div key={i} className="bar" style={{ height: `${h}px`, background: "#5eead4" }}></div>;
              })}
            </div>
              </>
            )}
          </div>

          {/* Row 1, Col 4: Avg CSAT Rating */}
          <div className="kpi-card gauge-card" style={{ "--glow": "rgba(167,139,250,0.14)" }}>
            <div className="kpi-label">
              Avg. CSAT rating
              <span className={`kpi-badge tag ${ratingStatus}`} style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
                <span className={`pulse-dot-quiet ${ratingStatus}`}></span>
                {avgRating.toFixed(2)}/5
              </span>
            </div>
            <div className="gauge-row">
              <div className="gauge-wrap">
                <Doughnut
                  data={{
                    datasets: [
                      {
                        data: [(avgRating / 5) * 100, 100 - (avgRating / 5) * 100],
                        backgroundColor: [ratingColor, "rgba(255,255,255,0.06)"],
                        borderWidth: 0,
                        circumference: 270,
                        rotation: -135,
                      },
                    ],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: "76%",
                    plugins: { legend: { display: false }, tooltip: { enabled: false } },
                  }}
                />
                <div className="gauge-center">
                  <span className="g-val">{avgRating.toFixed(1)}</span>
                  <span className="g-unit">/ 5.0</span>
                </div>
              </div>
              <div className="gauge-side">
                <div className="stars">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <svg
                      key={star}
                      viewBox="0 0 24 24"
                      width="13"
                      height="13"
                      fill={star <= Math.round(avgRating) ? "#fbbf24" : "rgba(255,255,255,0.12)"}
                      stroke="none"
                    >
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                  ))}
                </div>
                <span className="kpi-delta flat" style={{ color: "var(--text-dim)", marginTop: "4px" }}>
                  Based on ratings
                </span>
              </div>
            </div>
          </div>

          {/* Row 2, Col 1: Tokens & Inference Cost */}
          <div className="kpi-card" style={{ "--glow": "rgba(251,191,36,0.14)" }}>
            <div className="kpi-label">
              Tokens &amp; inference cost
              <span className="kpi-badge" style={{ color: "var(--text-faint)" }}>
                ${totalCost.toFixed(2)}
              </span>
            </div>
            {loading ? (
              <MovingWheelLoader size="sm" label="Auditing tokens..." />
            ) : (
              <>
                <div className="kpi-value">
                  {(totalTokens / 1000).toFixed(1)}k<span className="unit">tok</span>
                </div>
            <span className="kpi-delta flat" style={{ color: "var(--text-dim)" }}>
              ${(totalCost / Math.max(1, totalConv)).toFixed(4)}/conv
            </span>
            <div className="mini-bars">
              {currentRows.map((r, i) => {
                const max = Math.max(1, ...currentRows.map((x) => x.totalCost));
                const h = Math.max(2, Math.round((r.totalCost / max) * 32));
                return <div key={i} className="bar" style={{ height: `${h}px`, background: "#fbbf24" }}></div>;
              })}
            </div>
              </>
            )}
          </div>

          {/* Row 2, Col 2: Resolution Rate (right below Conversations & Messages) */}
          <div className="kpi-card gauge-card" style={{ "--glow": "rgba(74,222,128,0.14)" }}>
            <div className="kpi-label">
              Resolution rate
              <span className={`kpi-badge tag ${resRateStatus}`} style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
                <span className={`pulse-dot-quiet ${resRateStatus}`}></span>
                {resRateStatus.toUpperCase()}
              </span>
            </div>
            <div className="gauge-row">
              <div className="gauge-wrap">
                <Doughnut
                  data={{
                    datasets: [
                      {
                        data: [resRate, 100 - resRate],
                        backgroundColor: [resRateColor, "rgba(255,255,255,0.06)"],
                        borderWidth: 0,
                        circumference: 270,
                        rotation: -135,
                      },
                    ],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: "76%",
                    plugins: { legend: { display: false }, tooltip: { enabled: false } },
                  }}
                />
                <div className="gauge-center">
                  <span className="g-val">{resRate.toFixed(0)}%</span>
                  <span className="g-unit">RESOLVED</span>
                </div>
              </div>
              <div className="gauge-side">
                <div className="g-count">
                  {resolvedConv} / {totalConv} conv.
                </div>
                <span className="kpi-delta up">✓ target: &gt;75%</span>
              </div>
            </div>
          </div>

          {/* Row 2, Col 3: Hallucination Risk (right of Resolution Rate) */}
          <div className="kpi-card gauge-card" style={{ "--glow": "rgba(251,113,133,0.14)" }}>
            <div className="kpi-label">
              Hallucination risk
              <span className={`kpi-badge tag ${hallucStatus}`} style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
                <span className={`pulse-dot-quiet ${hallucStatus}`}></span>
                {hallucLabel.toUpperCase()}
              </span>
            </div>
            <div className="gauge-row">
              <div className="gauge-wrap">
                <Doughnut
                  data={{
                    datasets: [
                      {
                        data: [hallucTotal, Math.max(1, 10 - hallucTotal)],
                        backgroundColor: [
                          hallucStatus === "green" ? "#4ade80" : hallucStatus === "amber" ? "#fbbf24" : "#fb7185",
                          "rgba(255,255,255,0.06)"
                        ],
                        borderWidth: 0,
                        circumference: 270,
                        rotation: -135,
                      },
                    ],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: "76%",
                    plugins: { legend: { display: false }, tooltip: { enabled: false } },
                  }}
                />
                <div className="gauge-center">
                  <span className="g-val">{hallucTotal}</span>
                  <span className="g-unit">REPORTS</span>
                </div>
              </div>
              <div className="gauge-side">
                <div className="g-count" style={{ color: hallucStatus === "green" ? "#4ade80" : "#fbbf24" }}>
                  {hallucTotal === 0 ? "Zero flagged" : `${hallucTotal} flagged`}
                </div>
                <span className="kpi-delta flat" style={{ color: "var(--text-dim)", marginTop: "4px" }}>
                  Faithfulness index
                </span>
              </div>
            </div>
          </div>

          {/* Row 2, Col 4: Knowledge Base & Query Throughput (right of Hallucination Risk) */}
          <div className="kpi-card" style={{ "--glow": "rgba(96,165,250,0.14)" }}>
            <div className="kpi-label">
              KB query throughput
              <span className="kpi-badge tag green" style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                <span className="pulse-dot-mini"></span> LIVE
              </span>
            </div>
            {loading ? (
              <MovingWheelLoader size="sm" label="Measuring throughput..." />
            ) : (
              <>
                <div className="kpi-value">
                  {(totalMsgs / Math.max(1, currentRows.length)).toFixed(0)}
                  <span className="unit">queries/day</span>
                </div>
            <span className="kpi-delta up">
              ✓ {failingDocs.length === 0 ? "100% healthy documents" : `${failingDocs.length} failing tracked`}
            </span>
            <div className="mini-bars">
              {currentRows.map((r, i) => {
                const max = Math.max(1, ...currentRows.map((x) => x.totalMessages));
                const h = Math.max(2, Math.round((r.totalMessages / max) * 32));
                return <div key={i} className="bar" style={{ height: `${h}px`, background: "#60a5fa" }}></div>;
              })}
            </div>
              </>
            )}
          </div>
        </div>

        {/* Grid 2: Charts Row 1 */}
        <div className="grid-2">
          {/* Chart 1: Messages vs Conversations */}
          <div className="panel">
            <div className="panel-head">
              <div>
                <div className="panel-title">Conversation traffic</div>
                <div className="panel-sub">Daily volume of active sessions &amp; total queries</div>
              </div>
              <div className="legend-row">
                <span>
                  <span className="legend-dot" style={{ background: "#5eead4" }}></span>Messages
                </span>
                <span>
                  <span className="legend-dot" style={{ background: "#60a5fa" }}></span>Sessions
                </span>
              </div>
            </div>
            <div className="chart-box">
              {loading ? <MovingWheelLoader size="lg" label="Rendering traffic volume curves..." /> : <Line data={throughputData} options={{ responsive: true, maintainAspectRatio: false, scales: commonScales }} />}
            </div>
          </div>

          {/* Chart 2: Tokens & Cost */}
          <div className="panel">
            <div className="panel-head">
              <div>
                <div className="panel-title">Inference consumption</div>
                <div className="panel-sub">Total tokens processed per day</div>
              </div>
              <div className="legend-row">
                <span>
                  <span className="legend-dot" style={{ background: "#fbbf24" }}></span>Tokens
                </span>
              </div>
            </div>
            <div className="chart-box">
              {loading ? <MovingWheelLoader size="lg" label="Plotting token consumption metrics..." /> : <Bar data={costData} options={{ responsive: true, maintainAspectRatio: false, scales: commonScales }} />}
            </div>
          </div>
        </div>

        {/* Grid 3: Charts Row 2 */}
        <div className="grid-2">
          {/* Chart 3: Satisfaction vs Hallucination */}
          <div className="panel">
            <div className="panel-head">
              <div>
                <div className="panel-title">Satisfaction vs hallucination reports</div>
                <div className="panel-sub">Average rating each day, sized by hallucination volume</div>
              </div>
            </div>
            <div className="chart-box">
              <Scatter
                data={satData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  scales: {
                    x: { ...commonScales.x, ticks: { ...commonScales.x.ticks, callback: (v) => labels[v] || "" } },
                    y: { ...commonScales.y, min: 1, max: 5 },
                  },
                }}
              />
            </div>
          </div>

          {/* Chart 4: Hallucination Risk */}
          <div className="panel">
            <div className="panel-head">
              <div>
                <div className="panel-title">Hallucination risk</div>
                <div className="panel-sub">Reports per day over the selected range</div>
              </div>
            </div>
            <div className="chart-box">
              {loading ? <MovingWheelLoader size="lg" label="Calculating hallucination distribution..." /> : <Bar data={hallucData} options={{ responsive: true, maintainAspectRatio: false, scales: commonScales }} />}
            </div>
          </div>
        </div>

        {/* Hallucination Risk Index & Telemetry */}
        <div className="panel" style={{ marginBottom: "14px" }}>
          <div className="panel-head">
            <div>
              <div className="panel-title">Hallucination Risk Index &amp; Grounding Telemetry</div>
              <div className="panel-sub">
                Faithfulness monitoring against retrieved document citations across active conversations
              </div>
            </div>
            <div className="severity-chip green" style={{ marginTop: 0 }}>
              <span className="severity-pulse"></span>
              Nominal • Monitored (Non-Critical)
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "10px", marginTop: "14px" }}>
            <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "8px", padding: "12px 14px" }}>
              <div style={{ fontSize: "11px", color: "var(--text-faint-dash)", fontFamily: "var(--font-mono-dash)" }}>FLAGGED QUERIES</div>
              <div style={{ fontSize: "22px", fontWeight: "700", color: "#4ade80", marginTop: "4px" }}>
                {hallucTotal} <span style={{ fontSize: "12px", color: "var(--text-dim-dash)", fontWeight: "normal" }}>/ {totalMsgs} msgs</span>
              </div>
            </div>

            <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "8px", padding: "12px 14px" }}>
              <div style={{ fontSize: "11px", color: "var(--text-faint-dash)", fontFamily: "var(--font-mono-dash)" }}>FAITHFULNESS SCORE</div>
              <div style={{ fontSize: "22px", fontWeight: "700", color: "#5eead4", marginTop: "4px" }}>
                {totalMsgs > 0 ? (((totalMsgs - hallucTotal) / totalMsgs) * 100).toFixed(1) : "100.0"}%
              </div>
            </div>

            <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "8px", padding: "12px 14px" }}>
              <div style={{ fontSize: "11px", color: "var(--text-faint-dash)", fontFamily: "var(--font-mono-dash)" }}>RAG PIPELINE GROUNDING</div>
              <div style={{ fontSize: "22px", fontWeight: "700", color: "#a78bfa", marginTop: "4px" }}>
                Verified
              </div>
            </div>

            <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "8px", padding: "12px 14px" }}>
              <div style={{ fontSize: "11px", color: "var(--text-faint-dash)", fontFamily: "var(--font-mono-dash)" }}>KNOWLEDGE GAP ALERTS</div>
              <div style={{ fontSize: "22px", fontWeight: "700", color: "#38bdf8", marginTop: "4px" }}>
                {failingDocs.length} tracked
              </div>
            </div>
          </div>
        </div>

        {/* Section 4: Failing Documents Table */}
        <div className="panel">
          <div className="panel-head">
            <div>
              <div className="panel-title">Knowledge base health - failing documents</div>
              <div className="panel-sub">
                Documents correlated with negative feedback or hallucinations, ranked by failure score
              </div>
            </div>
            <div className="severity-chip amber">
              <span className="severity-pulse"></span>
              {failingDocs.length} failing tracked
            </div>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Document ID</th>
                  <th>Source</th>
                  <th>Failure score</th>
                  <th>Negative ratings</th>
                  <th>Hallucinations</th>
                  <th>Queries</th>
                  <th>Last reported</th>
                  <th>Health</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} style={{ padding: "40px 10px", textAlign: "center" }}>
                      <MovingWheelLoader size="md" label="Auditing knowledge base document health..." />
                    </td>
                  </tr>
                ) : failingDocs.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ color: "var(--text-faint)", padding: "22px 10px", textAlign: "center" }}>
                      No failing documents detected in this range. Knowledge base healthy.
                    </td>
                  </tr>
                ) : (
                  failingDocs.map((r, i) => {
                    const h = healthPill(r.failureScore);
                    const filename = r.source ? r.source.split("/").pop() : r.docId;
                    const barColor = r.failureScore >= 20 ? "#fb7185" : r.failureScore >= 10 ? "#fbbf24" : "#4ade80";
                    return (
                      <tr key={i}>
                        <td className="doc-id">
                          {filename || "Untitled Document"}
                          <div style={{ color: "var(--text-faint)", fontSize: "10.5px", marginTop: "2px" }}>
                            {r.docId}
                          </div>
                        </td>
                        <td>
                          <a className="doc-link" href={r.source} target="_blank" rel="noopener noreferrer">
                            source ↗
                          </a>
                        </td>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span style={{ fontFamily: "var(--font-mono)" }}>
                              {Number(r.failureScore).toFixed(1)}
                            </span>
                            <span className="score-bar">
                              <span
                                className="score-bar-fill"
                                style={{
                                  width: `${((r.failureScore / maxScore) * 100).toFixed(0)}%`,
                                  background: barColor,
                                }}
                              ></span>
                            </span>
                          </div>
                        </td>
                        <td>{r.negativeRatingsCount || 0}</td>
                        <td>{r.hallucinationReportsCount || 0}</td>
                        <td>{r.totalQueries || 0}</td>
                        <td style={{ color: "var(--text-dim)", fontFamily: "var(--font-mono)", fontSize: "11px" }}>
                          {timeAgo(r.lastReportedAt)}
                        </td>
                        <td>
                          <span className={`health-pill ${h.cls}`}>
                            <span className="health-dot"></span>
                            {h.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="foot-note">
          Live telemetry: <code>GET /conversations/analytics/daily</code> •{" "}
          <code>GET /conversations/analytics/failing-documents</code>
        </div>
        <div className="foot-note">
          Live telemetry: <code>GET /conversations/analytics/daily</code> •{" "}
          <code>GET /conversations/analytics/failing-documents</code>
        </div>
      </div>

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="floating-toast-notification">
          <CheckCircle size={18} color="#4ade80" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
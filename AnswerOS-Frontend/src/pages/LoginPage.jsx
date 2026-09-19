import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { authAPI } from "../api/api";
import { setCredentials } from "../store/authSlice";
import { ShieldCheck, UserCheck, Lock, Mail, AlertCircle, ArrowRight, Sparkles, Building } from "lucide-react";

export default function LoginPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // Separate states for Common User and Admin cards
  const [commonEmail, setCommonEmail] = useState("john.doe12@example.com");
  const [commonPassword, setCommonPassword] = useState("password123");
  const [commonLoading, setCommonLoading] = useState(false);
  const [commonError, setCommonError] = useState("");

  const [adminEmail, setAdminEmail] = useState("admin.master@example.com");
  const [adminPassword, setAdminPassword] = useState("adminSecure123");
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState("");

  // Handle Common User Login
  const handleCommonSubmit = async (e) => {
    e.preventDefault();
    setCommonLoading(true);
    setCommonError("");
    try {
      const res = await authAPI.login({
        email: commonEmail,
        password: commonPassword,
      });

      if (res.data && res.data.token) {
        dispatch(
          setCredentials({
            token: res.data.token,
            user: res.data.user,
          })
        );
        navigate("/user-home");
      }
    } catch (err) {
      setCommonError(
        err.response?.data?.error || "Login failed. Check your user credentials."
      );
    } finally {
      setCommonLoading(false);
    }
  };

  // Handle Admin Login
  const handleAdminSubmit = async (e) => {
    e.preventDefault();
    setAdminLoading(true);
    setAdminError("");
    try {
      const res = await authAPI.login({
        email: adminEmail,
        password: adminPassword,
      });

      if (res.data && res.data.token) {
        dispatch(
          setCredentials({
            token: res.data.token,
            user: res.data.user,
          })
        );
        navigate("/admin-home");
      }
    } catch (err) {
      setAdminError(
        err.response?.data?.error || "Login failed. Check your admin credentials."
      );
    } finally {
      setAdminLoading(false);
    }
  };

  return (
    <div className="login-container">
      {/* Dynamic ambient background glow */}
      <div className="glow-orb glow-orb-1"></div>
      <div className="glow-orb glow-orb-2"></div>

      <header className="login-header">
        <div className="badge">
          <Sparkles size={14} className="badge-icon" /> Enterprise AI Platform
        </div>
        <h1 className="title">Universal Access Portal</h1>
        <p className="subtitle">
          Select your portal to authenticate with secure role-based session isolation.
        </p>
      </header>

      <div className="cards-grid">
        {/* CARD 1: Common User Card */}
        <div className="card common-card">
          <div className="card-top-indicator user-indicator"></div>
          <div className="card-header">
            <div className="icon-wrapper user-icon-bg">
              <UserCheck size={28} className="user-icon" />
            </div>
            <div>
              <h2 className="card-title">Common User</h2>
              <p className="card-desc">Query knowledge base & explore indexed documents</p>
            </div>
          </div>

          {commonError && (
            <div className="error-banner">
              <AlertCircle size={16} />
              <span>{commonError}</span>
            </div>
          )}

          <form onSubmit={handleCommonSubmit} className="login-form">
            <div className="form-group">
              <label>Email Address</label>
              <div className="input-group">
                <Mail size={18} className="input-icon" />
                <input
                  type="email"
                  required
                  placeholder="user@example.com"
                  value={commonEmail}
                  onChange={(e) => setCommonEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Password</label>
              <div className="input-group">
                <Lock size={18} className="input-icon" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={commonPassword}
                  onChange={(e) => setCommonPassword(e.target.value)}
                />
              </div>
            </div>

            <div className="meta-hint">
              <Building size={14} /> Knowledge partition: <code>AnswerOS Global Main</code>
            </div>

            <button
              type="submit"
              disabled={commonLoading}
              className="btn btn-user"
            >
              {commonLoading ? (
                <span className="spinner"></span>
              ) : (
                <>
                  <span>Sign In as User</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>
        </div>

        {/* CARD 2: Admin Card */}
        <div className="card admin-card">
          <div className="card-top-indicator admin-indicator"></div>
          <div className="card-header">
            <div className="icon-wrapper admin-icon-bg">
              <ShieldCheck size={28} className="admin-icon" />
            </div>
            <div>
              <h2 className="card-title">System Admin</h2>
              <p className="card-desc">Upload documents, Kafka pipelines & analytics</p>
            </div>
          </div>

          {adminError && (
            <div className="error-banner">
              <AlertCircle size={16} />
              <span>{adminError}</span>
            </div>
          )}

          <form onSubmit={handleAdminSubmit} className="login-form">
            <div className="form-group">
              <label>Admin Email</label>
              <div className="input-group">
                <Mail size={18} className="input-icon" />
                <input
                  type="email"
                  required
                  placeholder="admin.master@example.com"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Admin Password</label>
              <div className="input-group">
                <Lock size={18} className="input-icon" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                />
              </div>
            </div>

            <div className="meta-hint admin-hint">
              <ShieldCheck size={14} /> Elevated privilege: full document ingestion & metrics
            </div>

            <button
              type="submit"
              disabled={adminLoading}
              className="btn btn-admin"
            >
              {adminLoading ? (
                <span className="spinner"></span>
              ) : (
                <>
                  <span>Sign In as Admin</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

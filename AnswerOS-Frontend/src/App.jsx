import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useSelector } from "react-redux";
import LoginPage from "./pages/LoginPage";
import UserHomePage from "./pages/UserHomePage";
import AdminHomePage from "./pages/AdminHomePage";
import DocumentUploadPage from "./pages/DocumentUploadPage";

// Protected Route Guard
function ProtectedRoute({ children, allowedRole }) {
  const { isAuthenticated, user } = useSelector((state) => state.auth);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRole && user?.role !== allowedRole) {
    return <Navigate to={user?.role === "admin" ? "/admin-home" : "/user-home"} replace />;
  }

  return children;
}

export default function App() {
  const { isAuthenticated, user } = useSelector((state) => state.auth);

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={
            isAuthenticated ? (
              <Navigate
                to={user?.role === "admin" ? "/admin-home" : "/user-home"}
                replace
              />
            ) : (
              <LoginPage />
            )
          }
        />

        <Route
          path="/user-home"
          element={
            <ProtectedRoute allowedRole="common">
              <UserHomePage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin-home"
          element={
            <ProtectedRoute allowedRole="admin">
              <AdminHomePage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/document-upload"
          element={
            <ProtectedRoute allowedRole="admin">
              <DocumentUploadPage />
            </ProtectedRoute>
          }
        />

        {/* Fallback redirect */}
        <Route
          path="*"
          element={<Navigate to="/login" replace />}
        />
      </Routes>
    </BrowserRouter>
  );
}
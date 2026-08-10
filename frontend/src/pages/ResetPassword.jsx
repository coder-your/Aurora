import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { resetPassword } from "../services/authService";
import "../styles/auth.css";
import AuthLayout from "../components/AuthLayout";

export default function ResetPassword() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const email = queryParams.get("email");
  const token = queryParams.get("token");

  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const isStrongPassword = (password) =>
    password.length >= 8 && /[A-Z]/.test(password) && /\d/.test(password);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!isStrongPassword(newPassword)) {
      setError("Password must be at least 8 characters with 1 uppercase letter and 1 number.");
      return;
    }

    setLoading(true);
    try {
      await resetPassword({ email, token, newPassword: newPassword.trim() });
      setSuccess("Password reset successful! Redirecting to login…");
      setTimeout(() => navigate("/login"), 2500);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  if (!email || !token) {
    return (
      <AuthLayout
        title="Reset link expired"
        subtitle="Request a new ritual to unlock your account"
      >
        <div className="auth-alert auth-alert--error">
          The password reset link is invalid or has expired. Please request a fresh link.
        </div>
        <div className="auth-footer">
          <button type="button" onClick={() => navigate("/forgot-password")}>
            Request new link
          </button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Set a new password"
      subtitle="Protect your studio with a stronger key"
    >
      {error && <div className="auth-alert auth-alert--error">{error}</div>}
      {success && <div className="auth-alert auth-alert--success">{success}</div>}

      <form className="auth-form" onSubmit={handleSubmit}>
        <div className="auth-field">
          <label className="auth-label" htmlFor="newPassword">
            New password
          </label>
          <input
            type="password"
            id="newPassword"
            name="newPassword"
            placeholder="••••••••"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="auth-input"
            required
          />
          <p className="auth-hint">Minimum 8 characters, incl. one uppercase letter and one number.</p>
        </div>

        <button type="submit" className="auth-btn" disabled={loading}>
          {loading ? "Resetting…" : "Save new password"}
        </button>
      </form>
    </AuthLayout>
  );
}

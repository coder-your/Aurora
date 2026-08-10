import { useState } from "react";
import { forgotPassword } from "../services/authService";
import "../styles/auth.css";
import AuthLayout from "../components/AuthLayout";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const response = await forgotPassword({ email: email.trim() });
      setSuccess(response.data.message);
      setTimeout(() => setSuccess(""), 5000);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to send reset email");
      setTimeout(() => setError(""), 5000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Restore your access"
      subtitle="We’ll send a new password ritual straight to your inbox"
    >
      {error && <div className="auth-alert auth-alert--error">{error}</div>}
      {success && <div className="auth-alert auth-alert--success">{success}</div>}

      <form className="auth-form" onSubmit={handleSubmit}>
        <div className="auth-field">
          <label className="auth-label" htmlFor="email">
            Email Address
          </label>
          <input
            type="email"
            id="email"
            name="email"
            placeholder="reader@aurora.club"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="auth-input"
            required
          />
        </div>

        <button type="submit" className="auth-btn" disabled={loading}>
          {loading ? "Sending…" : "Send reset link"}
        </button>
      </form>

      <div className="auth-footer">
        <span>Remembered it?</span>
        <button type="button" onClick={() => window.history.back()}>
          Go back
        </button>
      </div>
    </AuthLayout>
  );
}

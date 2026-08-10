import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { loginUser } from "../services/authService";
import "../styles/auth.css";
import AuthLayout from "../components/AuthLayout";
import SocialAuthButtons from "../components/SocialAuthButtons";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = location.state?.redirectTo;
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!isValidEmail(formData.email)) {
      setError("Invalid email format");
      return;
    }
    if (!formData.password) {
      setError("Password is required");
      return;
    }
    setLoading(true);
    try {
      const response = await loginUser(formData);
      if (response.data.step === "verify-2fa") {
        navigate("/verify-2fa", { state: { email: formData.email, redirectTo } });
      } else {
        // Token is already stored in cookie automatically
        // Navigate to intended destination or dashboard
        const destination = redirectTo || "/dashboard";
        window.location.href = destination;
      }

    } catch (err) {
      const data = err.response?.data;
      setError(
        data?.error ||
          data?.message ||
          (Array.isArray(data?.errors) ? data.errors.map((e) => e.message).join(", ") : null) ||
          "Login failed"
      );
      setFormData({ ...formData, password: "" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Sign in to Aurora"
      subtitle="Return to your velvet reading desk"
    >
      {error && <div className="auth-alert auth-alert--error">{error}</div>}

      <form className="auth-form" onSubmit={handleSubmit}>
        <div className="auth-field">
          <label className="auth-label" htmlFor="email">
            Email Address
          </label>
          <div className="auth-input-wrap">
            <span className="auth-input-icon">✉️</span>
            <input
              id="email"
              type="email"
              name="email"
              placeholder="reader@aurora.club"
              value={formData.email}
              onChange={handleChange}
              required
              className="auth-input"
            />
          </div>
        </div>

        <div className="auth-field">
          <label className="auth-label" htmlFor="password">
            Password
          </label>
          <div className="auth-input-wrap">
            <span className="auth-input-icon">🔒</span>
            <input
              id="password"
              type="password"
              name="password"
              placeholder="Enter your secret phrase"
              value={formData.password}
              onChange={handleChange}
              required
              className="auth-input"
            />
          </div>
        </div>

        <div className="auth-actions">
          <button type="button" onClick={() => navigate("/forgot-password")}>
            Forgot password?
          </button>
          <button type="button" onClick={() => navigate("/signup")}>
            Create account
          </button>
        </div>

        <button type="submit" disabled={loading} className="auth-btn">
          {loading ? "Signing you in…" : "Enter Aurora"}
        </button>
      </form>

      <SocialAuthButtons />
    </AuthLayout>
  );
}

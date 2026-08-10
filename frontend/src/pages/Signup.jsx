import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signupUser } from "../services/authService";
import "../styles/auth.css";
import AuthLayout from "../components/AuthLayout";
import SocialAuthButtons from "../components/SocialAuthButtons";

export default function Signup() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  // Email & Password validation (matches backend)
  const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const isStrongPassword = (password) =>
    password.length >= 8 && /[A-Z]/.test(password) && /\d/.test(password);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    // Frontend validations
    if (!isValidEmail(formData.email)) {
      setError("Invalid email format");
      return;
    }
    if (!isStrongPassword(formData.password)) {
      setError(
        "Password must be at least 8 chars, include 1 uppercase letter and 1 number"
      );
      return;
    }

    setLoading(true);

    try {
      const response = await signupUser(formData);
      setSuccess(response.data.message); // e.g., "User registered! Please verify your email"
      // Redirect to login after short delay
      setTimeout(() => navigate("/login"), 3000);
    } catch (err) {
      setError(err.response?.data?.error || "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Create Your Aurora Account"
      subtitle="Light a vintage lamp for your next chapter"
    >
      {error && <div className="auth-alert auth-alert--error">{error}</div>}
      {success && <div className="auth-alert auth-alert--success">{success}</div>}

      <form className="auth-form" onSubmit={handleSubmit}>
        <div className="auth-field-grid">
          <div className="auth-field">
            <label className="auth-label" htmlFor="first_name">
              First Name
            </label>
            <input
              type="text"
              id="first_name"
              name="first_name"
              placeholder="Evelyn"
              value={formData.first_name}
              onChange={handleChange}
              className="auth-input"
              required
            />
          </div>
          <div className="auth-field">
            <label className="auth-label" htmlFor="last_name">
              Last Name
            </label>
            <input
              type="text"
              id="last_name"
              name="last_name"
              placeholder="Rowe"
              value={formData.last_name}
              onChange={handleChange}
              className="auth-input"
              required
            />
          </div>
        </div>

        <div className="auth-field">
          <label className="auth-label" htmlFor="email">
            Email Address
          </label>
          <input
            type="email"
            id="email"
            name="email"
            placeholder="you@aurora.club"
            value={formData.email}
            onChange={handleChange}
            className="auth-input"
            required
          />
        </div>

        <div className="auth-field">
          <label className="auth-label" htmlFor="password">
            Password
          </label>
          <input
            type="password"
            id="password"
            name="password"
            placeholder="At least 8 characters"
            value={formData.password}
            onChange={handleChange}
            className="auth-input"
            required
          />
          <p className="auth-hint">
            Must include 1 uppercase letter and 1 number.
          </p>
        </div>

        <button type="submit" disabled={loading} className="auth-btn">
          {loading ? "Signing Up…" : "Create account"}
        </button>
      </form>

      <div className="auth-footer">
        <span>Already have an account?</span>
        <button type="button" onClick={() => navigate("/login")}>
          Sign in
        </button>
      </div>

      <SocialAuthButtons hideTitle />
    </AuthLayout>
  );
}

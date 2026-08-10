import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { verify2FAUser, resendOTP } from "../services/authService";
import "../styles/auth.css";
import AuthLayout from "../components/AuthLayout";

export default function Verify2FA() {
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email || "";
  const redirectTo = location.state?.redirectTo;

  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!email) navigate("/login"); // redirect if no email
  }, [email, navigate]);

  const handleVerify = async (e) => {
    e.preventDefault();
    setError("");

    const cleanOtp = otp.trim();
    if (!/^\d{6}$/.test(cleanOtp)) {
      setError("Enter the 6-digit code from your email.");
      return;
    }

    setLoading(true);

    try {
      const response = await verify2FAUser({ email, otp: cleanOtp });
      
      // Ensure token is stored before navigation
      if (response.data && response.data.token) {
        const token = response.data.token;
        console.log("Token received, storing in localStorage");
        localStorage.setItem("token", token);
        
        // Store user role from profile
        if (response.data.profile && response.data.profile.role) {
          localStorage.setItem("userRole", response.data.profile.role);
          console.log("User role stored:", response.data.profile.role);
        }
        
        // Verify token was stored
        const storedToken = localStorage.getItem("token");
        if (!storedToken || storedToken !== token) {
          setError("Failed to store authentication token");
          setLoading(false);
          return;
        }
        
        console.log("Token stored successfully:", storedToken.substring(0, 20) + "...");
        
        // Trigger custom event to notify App component
        window.dispatchEvent(new Event("token-updated"));
        
        // Use window.location for a full page reload to ensure clean state
        // Navigate to intended destination or dashboard
        const destination = redirectTo || "/dashboard";
        window.location.href = destination;
      } else {
        console.error("No token in response:", response.data);
        setError("Token not received from server");
      }
    } catch (err) {
      console.error("OTP verification error:", err);
      setError(err.response?.data?.error || "OTP verification failed");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      await resendOTP({ email });
      setSuccess("New OTP sent to your email!");
      setTimeout(() => setSuccess(""), 5000);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to resend OTP");
      setTimeout(() => setError(""), 5000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Two-Factor Verification"
      subtitle="For the safety of every reader’s nook"
    >
      <p className="auth-caption">
        Enter the 6-digit code sent to <span>{email}</span>
      </p>

      {error && <div className="auth-alert auth-alert--error">{error}</div>}
      {success && <div className="auth-alert auth-alert--success">{success}</div>}

      <form className="auth-form" onSubmit={handleVerify}>
        <div className="auth-field">
          <label className="auth-label" htmlFor="otp">
            One-Time Password
          </label>
          <input
            type="text"
            id="otp"
            name="otp"
            placeholder="••••••"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            className="auth-input"
            required
          />
        </div>

        <button type="submit" className="auth-btn" disabled={loading}>
          {loading ? "Verifying…" : "Confirm entry"}
        </button>
      </form>

      <div className="auth-footer auth-footer--inline">
        <span>Didn’t receive the code?</span>
        <button
          type="button"
          onClick={handleResend}
          className={loading ? "is-disabled" : ""}
        >
          Resend OTP
        </button>
      </div>
    </AuthLayout>
  );
}

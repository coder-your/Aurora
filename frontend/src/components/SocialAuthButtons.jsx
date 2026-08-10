import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useGoogleLogin } from "@react-oauth/google";
import { loginWithGoogleOAuth } from "../services/authService";

export default function SocialAuthButtons({ hideTitle = false }) {
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const googleEnabled = Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID);

  const completeLogin = (token, userRole) => {
    if (token) {
      localStorage.setItem("token", token);
      if (userRole) {
        localStorage.setItem("userRole", userRole);
      }
      window.dispatchEvent(new Event("token-updated"));
    }
    navigate("/dashboard");
  };

  const handleAuthError = (message) => {
    setError(message);
    setLoading(false);
  };

  const googleLogin = useGoogleLogin({
    flow: "implicit",
    scope: "openid email profile",
    onSuccess: async (tokenResponse) => {
      try {
        const { data } = await loginWithGoogleOAuth({
          accessToken: tokenResponse.access_token,
        });
        completeLogin(data.token, data.profile?.role);
      } catch (err) {
        handleAuthError(err.response?.data?.error || "Google authentication failed");
      } finally {
        setLoading(false);
      }
    },
    onError: () => handleAuthError("Google authentication was cancelled"),
  });

  const handleGoogleClick = () => {
    if (!googleEnabled || loading) return;
    setError("");
    setLoading(true);
    googleLogin();
  };

  return (
    <div className="auth-social">
      {!hideTitle && <p className="auth-social__label">Or continue with</p>}

      <div className="auth-social__buttons">
        <button
          type="button"
          className={`auth-social-btn auth-social-btn--google ${(!googleEnabled || loading) && "is-disabled"}`}
          onClick={handleGoogleClick}
          disabled={!googleEnabled || loading}
        >
          <span className="auth-social-btn__icon auth-social-btn__icon--google" aria-hidden="true">
            G
          </span>
          <span>{loading ? "Connecting…" : googleEnabled ? "Continue with Google" : "Google unavailable"}</span>
        </button>
      </div>

      {error && <p className="auth-social__error">{error}</p>}
    </div>
  );
}

import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";
import App from "./App";
import "./index.css";
import "./styles/global.css";
import "./styles/auth.css";
import "./styles/userManagement.css";
import "./styles/writerDashboard.module.css";
import "./styles/chapterEditor.module.css";

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

const AppTree = (
  <React.StrictMode>
    <BrowserRouter>
      {googleClientId ? (
        <GoogleOAuthProvider clientId={googleClientId}>
          <App />
        </GoogleOAuthProvider>
      ) : (
        <App />
      )}
    </BrowserRouter>
  </React.StrictMode>
);

ReactDOM.createRoot(document.getElementById("root")).render(AppTree);

// App.jsx
import React, { useState, useEffect } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";

import Signup from "./pages/Signup";
import Login from "./pages/Login";
import Verify2FA from "./pages/Verify2FA";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";

import Dashboard from "./pages/Dashboard";
import ProfileSettings from "./pages/ProfileSettings";
import WriterDashboard from "./pages/WriterDashboard";
import MoodBoard from "./pages/MoodBoard";
import CreateBook from "./pages/CreateBook";
import ChapterEditor from "./pages/ChapterEditor";
import ReaderDashboard from "./pages/ReaderDashboard";
import StoryDetail from "./pages/StoryDetail";
import MyLibrary from "./pages/MyLibrary";
import ReaderView from "./pages/ReaderView";
import Notifications from "./pages/Notifications";
import WriterInsights from "./pages/WriterInsights";
import WriterCommentIntelligence from "./pages/WriterCommentIntelligence";
import WriterSuccessScore from "./pages/WriterSuccessScore";
import WriterProfile from "./pages/WriterProfile";
import WriterOverview from "./pages/WriterOverview";
import AuroraCards from "./pages/AuroraCards";
import PlotTwistHallOfFame from "./pages/PlotTwistHallOfFame";
import WriterPlotTwists from "./pages/WriterPlotTwists";
import Community from "./pages/Community";
import Guidelines from "./pages/Guidelines";
import Terms from "./pages/Terms";
import BookTrailers from "./pages/BookTrailers";

const PrivateRoute = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = React.useState(() => {
    return !!localStorage.getItem("token");
  });

  React.useEffect(() => {
    const checkAuth = () => {
      setIsAuthenticated(!!localStorage.getItem("token"));
    };

    // Check immediately
    checkAuth();

    // Listen for token updates
    window.addEventListener("token-updated", checkAuth);
    window.addEventListener("storage", checkAuth);

    return () => {
      window.removeEventListener("token-updated", checkAuth);
      window.removeEventListener("storage", checkAuth);
    };
  }, []);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

const PublicOnlyRoute = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = React.useState(() => {
    return !!localStorage.getItem("token");
  });

  React.useEffect(() => {
    const checkAuth = () => {
      setIsAuthenticated(!!localStorage.getItem("token"));
    };

    checkAuth();
    window.addEventListener("token-updated", checkAuth);
    window.addEventListener("storage", checkAuth);

    return () => {
      window.removeEventListener("token-updated", checkAuth);
      window.removeEventListener("storage", checkAuth);
    };
  }, []);

  if (isAuthenticated) {
    return <Navigate to="/discover" replace />;
  }

  return children;
};

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem("token"));
  const location = useLocation();

  // Reactively update login state when token changes
  useEffect(() => {
    const checkAuth = () => {
      setIsLoggedIn(!!localStorage.getItem("token"));
    };

    // Check on mount
    checkAuth();

    // Listen for storage events (when token is set/removed)
    window.addEventListener("storage", checkAuth);
    
    // Also listen for custom events (for same-tab updates)
    window.addEventListener("token-updated", checkAuth);

    return () => {
      window.removeEventListener("storage", checkAuth);
      window.removeEventListener("token-updated", checkAuth);
    };
  }, []);

  const authPages = [
    "/login",
    "/signup",
    "/verify-2fa",
    "/forgot-password",
    "/reset-password",
  ];

  const hideNavbar = authPages.includes(location.pathname);

  return (
    <>
      {isLoggedIn && !hideNavbar && <Navbar />}

      <Routes>
        {/* AUTH ROUTES */}
        <Route
          path="/signup"
          element={
            <PublicOnlyRoute>
              <Signup />
            </PublicOnlyRoute>
          }
        />
        <Route
          path="/login"
          element={
            <PublicOnlyRoute>
              <Login />
            </PublicOnlyRoute>
          }
        />
        <Route
          path="/verify-2fa"
          element={
            <PublicOnlyRoute>
              <Verify2FA />
            </PublicOnlyRoute>
          }
        />
        <Route
          path="/forgot-password"
          element={
            <PublicOnlyRoute>
              <ForgotPassword />
            </PublicOnlyRoute>
          }
        />
        <Route
          path="/reset-password"
          element={
            <PublicOnlyRoute>
              <ResetPassword />
            </PublicOnlyRoute>
          }
        />

        <Route path="/guidelines" element={<Guidelines />} />
        <Route path="/terms" element={<Terms />} />

        {/* USER ROUTES */}
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          }
        />

        <Route
          path="/profile/settings"
          element={
            <PrivateRoute>
              <ProfileSettings />
            </PrivateRoute>
          }
        />

        {/* WRITER ROUTES */}
        <Route
          path="/writer"
          element={
            <PrivateRoute>
              <WriterDashboard />
            </PrivateRoute>
          }
        />

        <Route
          path="/mood-board"
          element={
            <PrivateRoute>
              <MoodBoard />
            </PrivateRoute>
          }
        />

        <Route
          path="/books/create"
          element={
            <PrivateRoute>
              <CreateBook />
            </PrivateRoute>
          }
        />

        <Route
          path="/books/:story_id/chapters"
          element={
            <PrivateRoute>
              <ChapterEditor />
            </PrivateRoute>
          }
        />

        {/* READER ROUTES */}
        <Route
          path="/discover"
          element={
            <PrivateRoute>
              <ReaderDashboard />
            </PrivateRoute>
          }
        />

        <Route
          path="/story/:storyId"
          element={
            <PrivateRoute>
              <StoryDetail />
            </PrivateRoute>
          }
        />

        <Route
          path="/library"
          element={
            <PrivateRoute>
              <MyLibrary />
            </PrivateRoute>
          }
        />

        <Route
          path="/read/:storyId"
          element={
            <PrivateRoute>
              <ReaderView />
            </PrivateRoute>
          }
        />

        <Route
          path="/notifications"
          element={
            <PrivateRoute>
              <Notifications />
            </PrivateRoute>
          }
        />

        <Route
          path="/community"
          element={
            <PrivateRoute>
              <Community />
            </PrivateRoute>
          }
        />

        <Route
          path="/book-trailers"
          element={
            <PrivateRoute>
              <BookTrailers />
            </PrivateRoute>
          }
        />

        <Route
          path="/writer-insights"
          element={
            <PrivateRoute>
              <WriterInsights />
            </PrivateRoute>
          }
        />

        <Route
          path="/writer-insights/comments"
          element={
            <PrivateRoute>
              <WriterCommentIntelligence />
            </PrivateRoute>
          }
        />

        <Route
          path="/writer-insights/success-score"
          element={
            <PrivateRoute>
              <WriterSuccessScore />
            </PrivateRoute>
          }
        />

        <Route
          path="/writer/:writerId"
          element={
            <PrivateRoute>
              <WriterProfile />
            </PrivateRoute>
          }
        />

        <Route
          path="/writer-overview"
          element={
            <PrivateRoute>
              <WriterOverview />
            </PrivateRoute>
          }
        />

        <Route
          path="/aurora-cards"
          element={
            <PrivateRoute>
              <AuroraCards />
            </PrivateRoute>
          }
        />

        <Route
          path="/aurora-cards/hall-of-fame"
          element={
            <PrivateRoute>
              <PlotTwistHallOfFame />
            </PrivateRoute>
          }
        />

        <Route
          path="/writer/plot-twists"
          element={
            <PrivateRoute>
              <WriterPlotTwists />
            </PrivateRoute>
          }
        />

        {/* DEFAULT */}
        <Route
          path="*"
          element={<Navigate to={isLoggedIn ? "/discover" : "/login"} replace />}
        />
      </Routes>

      <Footer />
    </>
  );
}

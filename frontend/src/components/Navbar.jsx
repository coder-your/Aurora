import React, { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { getMyProfile } from "../services/profileService";
import { unreadCount } from "../services/notificationService";
import "../styles/navbar.css";

export default function Navbar() {
  const [profileOpen, setProfileOpen] = useState(false);
  const [profile, setProfile] = useState(null);
  const [unread, setUnread] = useState(0);
  const profileRef = useRef();

  const refreshProfile = () => {
    getMyProfile()
      .then((res) => setProfile(res.data))
      .catch(() => setProfile(null));
  };

  // Fetch user profile on mount
  useEffect(() => {
    refreshProfile();
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadUnread = async () => {
      try {
        const res = await unreadCount();
        if (!cancelled) setUnread(res.data?.count || 0);
      } catch {
        if (!cancelled) setUnread(0);
      }
    };

    loadUnread();
    const handler = () => loadUnread();
    window.addEventListener("notifications-updated", handler);
    return () => {
      cancelled = true;
      window.removeEventListener("notifications-updated", handler);
    };
  }, []);

  useEffect(() => {
    const handler = () => refreshProfile();
    window.addEventListener("profile-updated", handler);
    return () => window.removeEventListener("profile-updated", handler);
  }, []);

  // Close profile dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <header className="navbar-container">
      {/* LEFT LOGO */}
      <Link to="/dashboard" className="navbar-logo">
        <span className="logo-text">Aurora</span>
        <span className="logo-star">✦</span>
      </Link>

      {/* CENTER NAV LINKS */}
      <nav className="navbar-center">
        <Link to="/discover" className="nav-link">Home</Link>
        <Link to="/discover" className="nav-link">Discover</Link>

        {/* Read Dropdown */}
        <div className="nav-group">
          <span className="nav-link">
            Read
            <svg className="dropdown-arrow" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </span>
          <div className="nav-dropdown">
            <Link to="/discover">
              <span className="dropdown-icon">🔍</span>
              Discover Stories
            </Link>
            <Link to="/library">
              <span className="dropdown-icon">📚</span>
              My Library
            </Link>
            <Link to="/book-trailers">
              <span className="dropdown-icon">🎬</span>
              Book Trailers
            </Link>
            <Link to="/aurora-cards">
              <span className="dropdown-icon">✨</span>
              Aurora Cards
            </Link>
          </div>
        </div>

        {/* Write Dropdown - visible only for writers */}
        {profile?.role === "writer" && (
          <div className="nav-group">
            <span className="nav-link">
              Write
              <svg className="dropdown-arrow" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </span>
            <div className="nav-dropdown">
              <Link to="/writer">
                <span className="dropdown-icon">📖</span>
                Books
              </Link>
              <Link to="/writer-insights">
                <span className="dropdown-icon">📊</span>
                Writer Insights
              </Link>
              <Link to="/mood-board">
                <span className="dropdown-icon">🎨</span>
                Mood Board
              </Link>
              <Link to="/writer/plot-twists">
                <span className="dropdown-icon">🎭</span>
                Plot Twists
              </Link>
            </div>
          </div>
        )}

        <Link to="/notifications" className="nav-link">
          Notifications
          {unread > 0 && <span className="nav-badge">{unread > 99 ? "99+" : unread}</span>}
        </Link>

        <Link to="/community" className="nav-link">Community</Link>
      </nav>

      {/* RIGHT PROFILE MENU */}
      <div className="profile-menu-wrapper" ref={profileRef}>
        <button
          className="profile-button"
          onClick={() => setProfileOpen(!profileOpen)}
        >
          {profile?.profile_image ? (
            <img 
              src={profile.profile_image} 
              alt="Profile" 
              className="profile-avatar"
            />
          ) : (
            <div className="profile-avatar-placeholder">
              {profile?.first_name ? profile.first_name.charAt(0).toUpperCase() : "U"}
            </div>
          )}
        </button>

        {profileOpen && (
          <div className="profile-dropdown">
            {/* Profile Header */}
            <div className="profile-dropdown-header">
              {profile?.profile_image ? (
                <img 
                  src={profile.profile_image} 
                  alt="Profile" 
                  className="profile-dropdown-avatar"
                />
              ) : (
                <div className="profile-dropdown-avatar-placeholder">
                  {profile?.first_name ? profile.first_name.charAt(0).toUpperCase() : "U"}
                </div>
              )}
              <div className="profile-dropdown-info">
                <span className="profile-dropdown-name">
                  {profile?.first_name || "User"} {profile?.last_name || ""}
                </span>
                <span className="profile-dropdown-handle">
                  @{profile?.handle_name || "username"}
                </span>
              </div>
            </div>

            <div className="profile-dropdown-divider"></div>

            {profile?.role === "writer" && (
              <div className="writer-dropdown-section">
                <Link
                  to="/writer-overview"
                  className="writer-dropdown-link"
                  onClick={() => setProfileOpen(false)}
                >
                  Writer overview
                </Link>
              </div>
            )}

            {/* Menu Items */}
            <div className="profile-dropdown-menu">
              <Link to="/profile/settings" className="profile-dropdown-item">
                <svg viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                </svg>
                Profile Settings
              </Link>
              {profile?.role === "writer" && (
                <Link to="/writer" className="profile-dropdown-item">
                  <svg viewBox="0 0 20 20" fill="currentColor">
                    <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
                  </svg>
                  My Books
                </Link>
              )}
            </div>

            <div className="profile-dropdown-divider"></div>

            {/* Logout */}
            <button
              className="profile-dropdown-logout"
              onClick={() => {
                localStorage.removeItem("token");
                localStorage.removeItem("userRole");
                window.location.href = "/login";
              }}
            >
              <svg viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
              </svg>
              Logout
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

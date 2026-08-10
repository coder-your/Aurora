import React, { useState, useEffect, useRef } from "react";
import api from "../services/api";

export default function DictionaryTooltip({ word, position: _position, onClose }) {
  const [meaning, setMeaning] = useState("");
  const [loading, setLoading] = useState(false);
  const tooltipRef = useRef(null);

  useEffect(() => {
    if (!word) {
      setMeaning("");
      return;
    }

    // Extract just the first word (remove punctuation and extra words)
    const cleanWord = word.split(/\s+/)[0].replace(/[^\w'-]/g, '').toLowerCase();
    if (!cleanWord || cleanWord.length < 2) {
      setMeaning("");
      return;
    }

    setLoading(true);
    const fetchMeaning = async () => {
      try {
        const res = await api.get(`/api/dictionary/${encodeURIComponent(cleanWord)}`);
        setMeaning(res.data.meaning || "No definition found");
      } catch (err) {
        console.error("Dictionary lookup error:", err);
        setMeaning(err.response?.data?.message || "Error fetching meaning");
      } finally {
        setLoading(false);
      }
    };
    
    // Debounce the API call
    const timer = setTimeout(fetchMeaning, 300);
    return () => clearTimeout(timer);
  }, [word]);

  // Hide tooltip when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (tooltipRef.current && !tooltipRef.current.contains(event.target)) {
        // Don't hide if clicking on selected text
        const selection = window.getSelection();
        if (!selection || !selection.toString().trim()) {
          // Tooltip will be hidden by parent component setting word to ""
        }
      }
    };

    if (word) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [word]);

  if (!word) return null;

  // Extract clean word for display
  const displayWord = word.split(/\s+/)[0].replace(/[^\w'-]/g, "");

  // Simple inline styles 
  const overlayStyle = {
    position: "fixed",
    inset: 0,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    // Dark translucent background with slight blur so content is dim but still visible
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    backdropFilter: "blur(4px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
  };

  const cardStyle = {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    boxShadow: "0 18px 45px rgba(0,0,0,0.25)",
    padding: "16px 20px",
    maxWidth: 360,
    width: "90%",
    fontSize: 14,
    color: "#111827",
  };

  const headerStyle = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  };

  const wordStyle = {
    fontWeight: 700,
    fontSize: 16,
    color: "#1f2937",
    marginRight: 12,
  };

  const closeBtnStyle = {
    fontSize: 13,
    padding: "4px 12px",
    borderRadius: 999,
    backgroundColor: "#facc15", // yellow pill button
    color: "#1f2937",
    fontWeight: 600,
    border: "none",
    cursor: "pointer",
  };

  const bodyStyle = {
    lineHeight: 1.5,
    marginTop: 4,
  };

  return (
    <div style={overlayStyle} onClick={() => onClose && onClose()}>
      <div
        ref={tooltipRef}
        style={cardStyle}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={headerStyle}>
          <div style={wordStyle}>{displayWord}</div>
          <button
            type="button"
            style={closeBtnStyle}
            onClick={() => onClose && onClose()}
          >
            Close
          </button>
        </div>
        <div style={bodyStyle}>
          {loading ? (
            <span style={{ color: "#6b7280" }}>Loading definition...</span>
          ) : (
            meaning || "No definition available"
          )}
        </div>
      </div>
    </div>
  );
}

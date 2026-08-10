import React, { useState } from "react";
import { Link } from "react-router-dom";
import { openPlotTwistEvent } from "../services/auroraCardsService";
import styles from "../styles/plotTwist.module.css";

export default function PlotTwistEventManager({ storyId, chapters = [] }) {
  const [chapterId, setChapterId] = useState("");
  const [maxSubmissions, setMaxSubmissions] = useState(30);
  const [votingEnabled, setVotingEnabled] = useState(true);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const handleOpen = async (e) => {
    e.preventDefault();
    setMsg("");
    setError("");
    if (!chapterId) {
      setError("Select a chapter.");
      return;
    }
    setBusy(true);
    try {
      const res = await openPlotTwistEvent(storyId, {
        chapterId: Number(chapterId),
        maxSubmissions: Number(maxSubmissions) || 30,
        votingEnabled,
      });
      setMsg(res.data.message || "Event opened for 48 hours.");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to open event.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.panel}>
      <h3>Open plot twist window</h3>
      <p className={styles.meta}>
        Readers spend an Aurora Card to suggest what happens next. Up to 30 submissions, 48-hour window.
        AI filters spam before you review.
      </p>
      <form className={styles.form} onSubmit={handleOpen}>
        <label>
          Target chapter (readers react to this chapter)
          <select
            value={chapterId}
            onChange={(e) => setChapterId(e.target.value)}
            style={{ display: "block", width: "100%", marginTop: "0.25rem", padding: "0.5rem" }}
          >
            <option value="">Select chapter…</option>
            {chapters.map((ch) => (
              <option key={ch.chapter_id} value={ch.chapter_id}>
                {ch.title || `Chapter ${ch.order_index + 1}`}
              </option>
            ))}
          </select>
        </label>
        <label>
          Max submissions
          <input
            type="number"
            min={1}
            max={30}
            value={maxSubmissions}
            onChange={(e) => setMaxSubmissions(e.target.value)}
          />
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.75rem" }}>
          <input
            type="checkbox"
            checked={votingEnabled}
            onChange={(e) => setVotingEnabled(e.target.checked)}
          />
          Enable community voting on top 10 AI-approved twists
        </label>
        {error && <p className={styles.error}>{error}</p>}
        {msg && <p className={styles.success}>{msg}</p>}
        <button type="submit" className={styles.submitBtn} disabled={busy}>
          {busy ? "Opening…" : "Open submission window"}
        </button>
      </form>
      <p style={{ marginTop: "1rem" }}>
        <Link to="/writer/plot-twists">Review submissions →</Link>
      </p>
    </div>
  );
}

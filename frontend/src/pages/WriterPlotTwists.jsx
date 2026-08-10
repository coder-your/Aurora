import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  listMyPlotTwistEvents,
  getPlotTwistDashboard,
  resolvePlotTwistDecision,
  openPlotTwistEvent,
} from "../services/auroraCardsService";
import { getWriterDashboard } from "../services/bookService";
import styles from "../styles/plotTwist.module.css";
import dashStyles from "../styles/auroraCards.module.css";

export default function WriterPlotTwists() {
  const [searchParams] = useSearchParams();
  const eventIdParam = searchParams.get("eventId");

  const [events, setEvents] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [selected, setSelected] = useState(eventIdParam ? Number(eventIdParam) : null);
  const [acceptedIds, setAcceptedIds] = useState([]);
  const [creditChapterId, setCreditChapterId] = useState("");
  const [creditNote, setCreditNote] = useState("");
  const [twistTitle, setTwistTitle] = useState("");
  const [twistText, setTwistText] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(true);

  // For creating new events
  const [books, setBooks] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newStoryId, setNewStoryId] = useState("");
  const [newChapterId, setNewChapterId] = useState("");
  const [creating, setCreating] = useState(false);
  const [loadingBooks, setLoadingBooks] = useState(true);
  const [bookChapters, setBookChapters] = useState([]);

  // Update chapter dropdown when story changes
  const handleStoryChange = (storyId) => {
    setNewStoryId(storyId);
    setNewChapterId("");
    const story = books.find(b => b.story_id === Number(storyId));
    setBookChapters(story?.chapters || []);
  };

  const loadEvents = () =>
    listMyPlotTwistEvents()
      .then((res) => setEvents(res.data.events || []))
      .catch(() => setEvents([]));

  const loadBooks = async () => {
    setLoadingBooks(true);
    try {
      const data = await getWriterDashboard();
      const allBooks = [...(data.drafts || []), ...(data.in_progress || []), ...(data.published || [])];
      console.log("Loaded books:", allBooks.length);
      setBooks(allBooks);
    } catch (e) {
      console.error("Failed to load books", e);
      setMsg("Could not load your stories. Make sure you have published or in-progress stories.");
    } finally {
      setLoadingBooks(false);
    }
  };

  useEffect(() => {
    loadEvents().finally(() => setLoading(false));
    loadBooks();
  }, []);

  useEffect(() => {
    if (!selected) {
      setDashboard(null);
      return;
    }
    getPlotTwistDashboard(selected)
      .then((res) => setDashboard(res.data))
      .catch(() => setDashboard(null));
  }, [selected]);

  const toggleAccepted = (id) => {
    setAcceptedIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      // Auto-fill twist content from first selected submission
      if (next.length > 0 && dashboard) {
        const sub = dashboard.submissions.find((s) => s.submissionId === next[0]);
        if (sub) {
          setTwistTitle(sub.twistTitle || "");
          setTwistText(sub.twistDescription || "");
        }
      } else if (next.length === 0) {
        setTwistTitle("");
        setTwistText("");
      }
      return next;
    });
  };

  const submitDecision = async (decision) => {
    setMsg("");
    try {
      await resolvePlotTwistDecision(selected, {
        decision,
        acceptedSubmissionIds: decision === "reject" ? [] : acceptedIds,
        creditChapterId: creditChapterId ? Number(creditChapterId) : null,
        creditNote: creditNote || undefined,
        twistTitle: decision === "reject" ? undefined : twistTitle || undefined,
        twistText: decision === "reject" ? undefined : twistText || undefined,
      });
      setMsg(`Decision saved: ${decision}`);
      loadEvents();
      const dash = await getPlotTwistDashboard(selected);
      setDashboard(dash.data);
    } catch (e) {
      setMsg(e.response?.data?.message || "Failed to save decision.");
    }
  };

  const handleCreateEvent = async () => {
    if (!newStoryId || !newChapterId) {
      setMsg("Please select a story and chapter.");
      return;
    }
    setCreating(true);
    setMsg("");
    try {
      const res = await openPlotTwistEvent(Number(newStoryId), {
        chapterId: Number(newChapterId),
      });
      setMsg("Plot twist event opened! Readers can now submit twists.");
      setShowCreateForm(false);
      loadEvents();
      setSelected(res.data.eventId);
    } catch (e) {
      setMsg(e.response?.data?.message || "Failed to open event.");
    } finally {
      setCreating(false);
    }
  };

  if (loading) return <div className={styles.dashboard}>Loading…</div>;

  return (
    <div className={styles.dashboard}>
      <div className={dashStyles.hero}>
        <h1>Plot Twist Review</h1>
        <p>AI-filtered submissions only. You are never required to use any twist.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: "1.5rem" }}>
        <aside>
          <h3>Your events</h3>
          {events.map((e) => (
            <button
              key={e.eventId}
              type="button"
              onClick={() => setSelected(e.eventId)}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                marginBottom: "0.5rem",
                padding: "0.75rem",
                borderRadius: "8px",
                border: selected === e.eventId ? "2px solid #5b21b6" : "1px solid #e2e8f0",
                background: "#fff",
                cursor: "pointer",
              }}
            >
              <strong>{e.storyTitle}</strong>
              <br />
              <span style={{ fontSize: "0.85rem" }}>
                Ch. {e.chapterTitle} · {e.submissionCount} submissions · {e.status}
              </span>
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              if (books.length === 0 && loadingBooks) {
                setMsg("Loading your stories...");
                loadBooks();
              }
              // Reset form and load chapters for first book if available
              setNewStoryId("");
              setNewChapterId("");
              setBookChapters([]);
              if (books.length > 0) {
                handleStoryChange(books[0].story_id);
              }
              setShowCreateForm(true);
            }}
            className="primary"
            style={{ padding: "0.5rem 1rem", marginTop: "0.5rem", width: "100%" }}
          >
            {loadingBooks ? "Loading stories..." : "+ Open Plot Twist Event"}
          </button>
          {!events.length && (
            <p style={{ color: "#64748b", marginTop: "0.5rem", fontSize: "0.85rem" }}>
              No plot twist events yet.
            </p>
          )}
        </aside>

        <main>
          {!dashboard ? (
            <div>
              <p>Select an event to review submissions.</p>
              <p style={{ color: "#64748b", fontSize: "0.9rem", marginTop: "0.5rem" }}>
                Tip: Create an event for a chapter, then share your story link with readers so they can submit plot twists using Aurora Cards.
              </p>
            </div>
          ) : (
            <>
              <h2>
                {dashboard.storyTitle} — {dashboard.chapterTitle}
              </h2>
              <p className={styles.meta}>
                Status: {dashboard.status} · Closes {new Date(dashboard.closesAt).toLocaleString()}
              </p>
              {dashboard.status === "OPEN" && !dashboard.submissions?.length && (
                <div style={{ background: "#fef3c7", padding: "0.75rem", borderRadius: "8px", marginTop: "0.5rem", fontSize: "0.9rem" }}>
                  <p style={{ margin: 0 }}>📢 This event is OPEN.</p>
                  <p style={{ margin: "0.5rem 0" }}>Share this link with readers so they can submit plot twists:</p>
                  <code style={{ display: "block", background: "#fff", padding: "0.5rem", borderRadius: "4px", wordBreak: "break-all", fontSize: "0.85rem" }}>
                    {typeof window !== "undefined" ? window.location.origin : ""}/story/{dashboard.storyId}?twistChapter={dashboard.chapterId}
                  </code>
                </div>
              )}

              {dashboard.insights?.aiFavoriteId && (
                <p className={styles.meta}>
                  AI favorite #{dashboard.insights.aiFavoriteId}
                  {dashboard.insights.communityFavoriteId &&
                    ` · Community favorite #${dashboard.insights.communityFavoriteId}`}
                </p>
              )}

              {dashboard.submissions?.length > 0 && (
                <p className={styles.meta}>
                  {dashboard.submissions.filter(s => s.voteCount > 0).length > 0 &&
                    `Community favorites by votes · `}
                  Total: {dashboard.submissions.length} submissions
                </p>
              )}

              {dashboard.submissions?.length === 0 && (
                <p style={{ color: "#64748b", marginTop: "1rem" }}>No submissions yet. Readers can submit using Aurora Cards.</p>
              )}

              {(dashboard.submissions || []).map((s) => (
                <div key={s.submissionId} className={styles.submissionCard}>
                  <div className={styles.checkboxRow}>
                    <input
                      type="checkbox"
                      checked={acceptedIds.includes(s.submissionId)}
                      onChange={() => toggleAccepted(s.submissionId)}
                      id={`sub-${s.submissionId}`}
                    />
                    <label htmlFor={`sub-${s.submissionId}`}>
                      <strong>#{s.displayNumber} {s.twistTitle}</strong> by @{s.submitter.handle}
                    </label>
                  </div>
                  <div className={styles.scores}>
                    <span>Quality {Math.round(s.qualityScore || 0)}%</span>
                    <span>Originality: {s.originality}</span>
                    <span>Excitement: {s.excitement}</span>
                    <span>Votes: {s.voteCount}</span>
                  </div>
                  <p>{s.twistDescription}</p>
                  <p style={{ fontSize: "0.85rem", color: "#64748b" }}>
                    <em>Why it fits:</em> {s.whyFits}
                  </p>
                </div>
              ))}

              {(!dashboard.submissions || dashboard.submissions.length === 0) && (
                <p>No submissions yet. Readers can submit using Aurora Cards.</p>
              )}

              {acceptedIds.length > 0 && (
                <div style={{ marginTop: "1rem", padding: "1rem", background: "#f0fdf4", borderRadius: "8px" }}>
                  <h4 style={{ marginTop: 0 }}>Selected twist for your chapter</h4>
                  <label>
                    Twist title
                    <input
                      type="text"
                      value={twistTitle}
                      onChange={(e) => setTwistTitle(e.target.value)}
                      placeholder="Twist title"
                      style={{ display: "block", marginTop: "0.25rem", padding: "0.5rem", width: "100%" }}
                    />
                  </label>
                  <label style={{ display: "block", marginTop: "0.75rem" }}>
                    Twist text (to include at chapter end)
                    <textarea
                      value={twistText}
                      onChange={(e) => setTwistText(e.target.value)}
                      rows={4}
                      placeholder="Twist content to append at end of your chapter..."
                      style={{ display: "block", marginTop: "0.25rem", width: "100%" }}
                    />
                  </label>
                  <p style={{ fontSize: "0.85rem", color: "#64748b", marginTop: "0.5rem" }}>
                    This will be shown at the end of your chapter with @{dashboard.submissions.find(s => acceptedIds[0] === s.submissionId)?.submitter.handle}'s credit.
                  </p>
                </div>
              )}

              <div style={{ marginTop: "1rem" }}>
                <label>
                  Show twist at end of chapter
                  <select
                    value={creditChapterId}
                    onChange={(e) => setCreditChapterId(e.target.value)}
                    style={{ display: "block", marginTop: "0.25rem", padding: "0.5rem", width: "100%" }}
                  >
                    <option value="">Select chapter...</option>
                    {(dashboard.chapters || []).map((ch) => (
                      <option key={ch.chapterId} value={ch.chapterId}>
                        Chapter {ch.chapterNumber}: {ch.title}
                      </option>
                    ))}
                  </select>
                  <p style={{ fontSize: "0.8rem", color: "#64748b", marginTop: "0.25rem" }}>
                    Choose which chapter this twist appears at the end.
                  </p>
                </label>
                <label style={{ display: "block", marginTop: "0.75rem" }}>
                  Reader contribution note (optional)
                  <textarea
                    value={creditNote}
                    onChange={(e) => setCreditNote(e.target.value)}
                    rows={2}
                    style={{ display: "block", marginTop: "0.25rem", width: "100%" }}
                  />
                </label>
              </div>

              <div className={styles.decisionBar}>
                <button type="button" className="primary" onClick={() => submitDecision("accept")}>
                  Accept selected
                </button>
                <button type="button" onClick={() => submitDecision("combine")}>
                  Combine selected
                </button>
                <button type="button" onClick={() => submitDecision("reject")}>
                  Reject all
                </button>
              </div>
              {msg && <p className={styles.success}>{msg}</p>}
            </>
          )}
        </main>
      </div>

      <Link to="/writer" className={dashStyles.linkBtn} style={{ display: "inline-block", marginTop: "2rem" }}>
        Back to Writer Dashboard
      </Link>

      {showCreateForm && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50
        }} onClick={() => setShowCreateForm(false)}>
          <div style={{ background: "#fff", padding: "2rem", borderRadius: "12px", maxWidth: "400px", width: "90%" }} onClick={e => e.stopPropagation()}>
            <h3>Open Plot Twist Event</h3>
            <label style={{ display: "block", marginTop: "1rem" }}>
              Select Story
              <select
                value={newStoryId}
                onChange={e => handleStoryChange(e.target.value)}
                style={{ display: "block", marginTop: "0.25rem", width: "100%", padding: "0.5rem" }}
              >
                <option value="">Choose a story...</option>
                {books.map(b => <option key={b.story_id} value={b.story_id}>{b.title}</option>)}
              </select>
            </label>
            <label style={{ display: "block", marginTop: "1rem" }}>
              Select Chapter
              <select
                value={newChapterId}
                onChange={e => setNewChapterId(e.target.value)}
                style={{ display: "block", marginTop: "0.25rem", width: "100%", padding: "0.5rem" }}
                disabled={!newStoryId}
              >
                <option value="">Choose a chapter...</option>
                {bookChapters.map(ch => (
                  <option key={ch.chapter_id} value={ch.chapter_id}>
                    Chapter {ch.order_index + 1}: {ch.title || "Untitled"}
                  </option>
                ))}
              </select>
            </label>
            <p style={{ fontSize: "0.85rem", color: "#64748b", marginTop: "0.5rem" }}>
              Select a chapter where readers can submit plot twists.
            </p>
            {msg && <p style={{ color: "#64748b", marginTop: "0.5rem" }}>{msg}</p>}
            <div style={{ marginTop: "1.5rem", display: "flex", gap: "0.5rem" }}>
              <button type="button" onClick={() => setShowCreateForm(false)} style={{ padding: "0.5rem 1rem" }}>
                Cancel
              </button>
              <button type="button" className="primary" onClick={handleCreateEvent} disabled={creating} style={{ padding: "0.5rem 1rem" }}>
                {creating ? "Creating..." : "Open Event"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

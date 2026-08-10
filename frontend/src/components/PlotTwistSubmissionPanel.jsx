import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  getChapterPlotTwistEvent,
  getMyEngagement,
  submitPlotTwist,
  getVotingPool,
  votePlotTwist,
} from "../services/auroraCardsService";
import styles from "../styles/plotTwist.module.css";

const MIN_CHARS = 100;
const MAX_CHARS = 300;


export default function PlotTwistSubmissionPanel({ chapterId }) {
  const [event, setEvent] = useState(null);
  const [cards, setCards] = useState([]);
  const [selectedCardId, setSelectedCardId] = useState("");
  const [twistTitle, setTwistTitle] = useState("");
  const [twistDescription, setTwistDescription] = useState("");
  const [whyFits, setWhyFits] = useState("");
  const [votingPool, setVotingPool] = useState([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const combinedLen = useMemo(
    () => `${twistTitle} ${twistDescription} ${whyFits}`.trim().length,
    [twistTitle, twistDescription, whyFits]
  );

  const load = useCallback(async () => {
    if (!chapterId) return;
    try {
      const [evRes, engRes] = await Promise.all([
        getChapterPlotTwistEvent(chapterId),
        getMyEngagement(),
      ]);
      setEvent(evRes.data.event);
      setCards(engRes.data.availableCards || []);
      if (evRes.data.event?.eventId) {
        const voteRes = await getVotingPool(evRes.data.event.eventId);
        setVotingPool(voteRes.data.submissions || []);
      }
    } catch {
      setEvent(null);
    }
  }, [chapterId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    if (!event?.eventId) return;
    if (!selectedCardId) {
      setError("Select an Aurora Card to spend.");
      return;
    }
    if (combinedLen < MIN_CHARS || combinedLen > MAX_CHARS) {
      setError(`Combined text must be ${MIN_CHARS}–${MAX_CHARS} characters.`);
      return;
    }
    setBusy(true);
    try {
      const res = await submitPlotTwist(event.eventId, {
        cardId: Number(selectedCardId),
        twistTitle,
        twistDescription,
        whyFits,
      });
      setMessage(res.data.message || "Submitted!");
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Submission failed.");
    } finally {
      setBusy(false);
    }
  };

  const handleVote = async (submissionId) => {
    try {
      await votePlotTwist(submissionId);
      setMessage("Vote recorded.");
      const voteRes = await getVotingPool(event.eventId);
      setVotingPool(voteRes.data.submissions || []);
    } catch (err) {
      setError(err.response?.data?.message || "Could not vote.");
    }
  };

  if (!event || event.status === "expired") return null;

  const isOpen = event.status === "open" && new Date(event.closesAt) > new Date();

  return (
    <div className={styles.panel}>
      <h3>Plot Twist Submission</h3>
      <p className={styles.meta}>
        {event.storyTitle} · Chapter: {event.chapterTitle}
        <br />
        {isOpen
          ? `${event.slotsLeft} slots left · Closes ${new Date(event.closesAt).toLocaleString()}`
          : `Window ${event.status}`}
      </p>

      {event.userHasSubmitted ? (
        <p className={styles.success}>You already submitted. Submissions cannot be edited.</p>
      ) : isOpen && event.slotsLeft > 0 ? (
        <form className={styles.form} onSubmit={handleSubmit}>
          <label>
            Aurora Card (1 per submission)
            <select
              value={selectedCardId}
              onChange={(e) => setSelectedCardId(e.target.value)}
              style={{ display: "block", width: "100%", marginTop: "0.25rem", padding: "0.5rem" }}
            >
              <option value="">Select a card…</option>
              {cards.map((c) => (
                <option key={c.cardId} value={c.cardId}>
                  {c.rarity} card #{c.cardId}
                </option>
              ))}
            </select>
          </label>
          {!cards.length && (
            <p style={{ fontSize: "0.85rem", color: "#64748b" }}>
              Earn cards on the <a href="/aurora-cards">Aurora Cards</a> page (1,000 points each).
            </p>
          )}

          <label>
            Twist title
            <input
              value={twistTitle}
              onChange={(e) => setTwistTitle(e.target.value)}
              placeholder="The Betrayal"
              maxLength={120}
            />
          </label>

          <label>
            Twist description
            <textarea
              value={twistDescription}
              onChange={(e) => setTwistDescription(e.target.value)}
              rows={3}
              placeholder="What happens in your proposed twist?"
            />
          </label>

          <label>
            Why this twist fits
            <textarea
              value={whyFits}
              onChange={(e) => setWhyFits(e.target.value)}
              rows={2}
              placeholder="Reference earlier chapters…"
            />
          </label>

          <div className={`${styles.charCount} ${combinedLen < MIN_CHARS || combinedLen > MAX_CHARS ? styles.warn : ""}`}>
            {combinedLen} / {MIN_CHARS}–{MAX_CHARS} characters (combined)
          </div>

          {error && <p className={styles.error}>{error}</p>}
          {message && <p className={styles.success}>{message}</p>}

          <button type="submit" className={styles.submitBtn} disabled={busy || !cards.length}>
            {busy ? "Submitting…" : "Submit plot twist (uses 1 card)"}
          </button>
        </form>
      ) : (
        <p className={styles.meta}>Submissions are closed for this chapter.</p>
      )}

      {event.votingEnabled && votingPool.length > 0 && (
        <>
          <h4 style={{ marginTop: "1.25rem" }}>Community vote — top twists</h4>
          <ul className={styles.voteList}>
            {votingPool.map((s) => (
              <li key={s.submission_id}>
                <span>
                  {s.twist_title} ({s.vote_count} votes, {Math.round(s.quality_score || 0)}% quality)
                </span>
                <button type="button" onClick={() => handleVote(s.submission_id)}>
                  Vote
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

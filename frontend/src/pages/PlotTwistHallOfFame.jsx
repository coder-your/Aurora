import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getHallOfFame } from "../services/auroraCardsService";
import styles from "../styles/auroraCards.module.css";

export default function PlotTwistHallOfFame() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getHallOfFame()
      .then((res) => setData(res.data))
      .catch(() => setData({ topContributors: [], recentAcceptedTwists: [] }))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className={styles.page}>Loading…</div>;

  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <h1>Plot Twist Hall of Fame</h1>
        <p>Readers who shaped stories through Aurora Card submissions.</p>
      </div>

      <h2>Top contributors</h2>
      <div className={styles.hofGrid}>
        {(data?.topContributors || []).map((c) => (
          <div key={c.userId} className={styles.contributorRow}>
            <div>
              <strong>@{c.handle}</strong>
              <span className={styles.badge} style={{ marginLeft: "0.5rem" }}>
                Level {c.influencerLevel}
              </span>
            </div>
            <div style={{ marginLeft: "auto", fontSize: "0.85rem", color: "#64748b" }}>
              {c.acceptedCount} accepted · {c.storiesInfluenced} stories
            </div>
          </div>
        ))}
        {!data?.topContributors?.length && (
          <p style={{ color: "#64748b" }}>No accepted twists yet. Be the first!</p>
        )}
      </div>

      <h2 style={{ marginTop: "2rem" }}>Recently accepted twists</h2>
      <div className={styles.hofGrid}>
        {(data?.recentAcceptedTwists || []).map((t) => (
          <div key={t.submissionId} className={styles.card}>
            <strong>{t.twistTitle}</strong>
            <p style={{ margin: "0.35rem 0", fontSize: "0.9rem" }}>
              {t.storyTitle} · {t.chapterTitle}
            </p>
            <p style={{ fontSize: "0.85rem", color: "#64748b" }}>
              @{t.handle} · Quality {t.qualityScore}%
            </p>
            {t.storyId && (
              <Link to={`/story/${t.storyId}`} style={{ fontSize: "0.85rem" }}>
                View story
              </Link>
            )}
          </div>
        ))}
      </div>

      <div className={styles.linkRow}>
        <Link to="/aurora-cards" className={styles.linkBtn}>
          My Aurora Cards
        </Link>
      </div>
    </div>
  );
}

import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  getMyEngagement,
  getMyContributorProfile,
} from "../services/auroraCardsService";
import styles from "../styles/auroraCards.module.css";

const ACTIVITY_LABELS = {
  chapter_read: "Read a chapter",
  book_complete: "Finished a book",
  review: "Wrote a review",
  follow_author: "Followed an author",
  daily_streak: "Daily streak",
  bookmark: "Bookmarked",
  share_book: "Shared a book",
  share_chapter: "Shared a chapter",
  comment: "Commented",
  chapter_like: "Liked a chapter",
  story_like: "Liked a story",
};

const rarityClass = (r) => {
  if (r === "legendary") return styles.rarityLegendary;
  if (r === "rare") return styles.rarityRare;
  return styles.rarityCommon;
};

export default function AuroraCards() {
  const [engagement, setEngagement] = useState(null);
  const [contributor, setContributor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const [engRes, contribRes] = await Promise.all([
          getMyEngagement(),
          getMyContributorProfile(),
        ]);
        setEngagement(engRes.data);
        setContributor(contribRes.data);
      } catch (e) {
        setError(e.response?.data?.message || "Could not load Aurora Cards.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div className={styles.page}>Loading Aurora Cards…</div>;
  if (error) {
    return (
      <div className={styles.page}>
        <p>{error}</p>
        <p style={{ fontSize: "0.9rem", color: "#64748b" }}>
          Run database migration: <code>npx prisma migrate deploy</code> in the backend folder.
        </p>
      </div>
    );
  }

  const cyclePct =
    engagement.pointsInCurrentCycle > 0
      ? Math.min(100, (engagement.pointsInCurrentCycle / 50) * 100)
      : 0;

  return (

    <div className={styles.page}>
      <div className={styles.hero}>
        <h1>Aurora Cards</h1>
        <p>
          Earn cards through reading, reviewing, and engaging. Spend one card to submit a plot twist
          when an author opens a submission window.
        </p>
      </div>

      <div className={styles.grid}>
        <div className={styles.card}>
          <div className={styles.statValue}>{engagement.totalPoints}</div>
          <div>Total engagement points</div>
          <div className={styles.progressBar}>
            <div
              className={styles.progressFill}
              style={{ width: `${cyclePct}%` }}
            />
          </div>
          <p style={{ marginTop: "0.5rem", fontSize: "0.85rem" }}>
            {engagement.pointsUntilNextCard} points until your next card (50 per card)

          </p>
        </div>

        <div className={styles.card}>
          <div className={styles.statValue}>{engagement.availableCards?.length ?? 0}</div>
          <div>Cards ready to use</div>
          <p style={{ fontSize: "0.85rem", color: "#64748b", marginTop: "0.5rem" }}>
            Streak: {engagement.dailyStreak} day(s) · {engagement.totalCardsEarned} earned lifetime
          </p>
        </div>

        <div className={styles.card}>
          <div className={styles.statValue}>Level {contributor?.influencerLevel ?? 1}</div>
          <div>Story Influencer</div>
          <p style={{ fontSize: "0.85rem", marginTop: "0.5rem" }}>
            {contributor?.acceptedCount ?? 0} accepted twists ·{" "}
            {Math.round((contributor?.approvalRate ?? 0) * 100)}% approval
          </p>
        </div>
      </div>

      <div className={styles.card} style={{ marginTop: "1rem" }}>
        <h2 style={{ marginTop: 0 }}>Your cards</h2>
        {!engagement.availableCards?.length ? (
          <p style={{ color: "#64748b" }}>No available cards. Keep reading and engaging!</p>
        ) : (
          engagement.availableCards.map((c) => (
            <div key={c.cardId} className={styles.auroraCardItem}>
              <span className={rarityClass(c.rarity)}>
                {c.rarity.charAt(0).toUpperCase() + c.rarity.slice(1)} Aurora Card
              </span>
              <span style={{ fontSize: "0.8rem", color: "#94a3b8" }}>
                #{c.cardId}
              </span>
            </div>
          ))
        )}
      </div>

      <div className={styles.card} style={{ marginTop: "1rem" }}>
        <h2 style={{ marginTop: 0 }}>Recent activity</h2>
        <ul className={styles.activityList}>
          {(engagement.recentActivity || []).map((a, i) => (
            <li key={i}>
              +{a.points} · {ACTIVITY_LABELS[a.activityType] || a.activityType}
            </li>
          ))}
          {!engagement.recentActivity?.length && <li>No activity yet.</li>}
        </ul>
      </div>

      <div className={styles.linkRow}>
        <Link to="/aurora-cards/hall-of-fame" className={styles.linkBtn}>
          Plot Twist Hall of Fame
        </Link>
        <Link to="/discover" className={`${styles.linkBtn} ${styles.linkBtnSecondary}`}>
          Back to Discover
        </Link>
      </div>
    </div>
  );
}

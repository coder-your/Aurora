import React, { useEffect, useMemo, useState } from "react";
import { insightsCommentIntelligence, insightsBooks } from "../services/insightsService";
import styles from "../styles/writerInsights.module.css";

const SENTIMENT_COLORS = {
  hype: "#4ade80",
  emotional: "#f472b6",
  analytical: "#60a5fa",
  critic: "#fbbf24",
  neutral: "#94a3b8",
};

const SENTIMENT_LABELS = {
  hype: "Hype",
  emotional: "Emotional",
  analytical: "Theorists",
  critic: "Critics",
  neutral: "Neutral",
};

export default function WriterCommentIntelligence() {
  const [data, setData] = useState(null);
  const [books, setBooks] = useState([]);
  const [selectedStory, setSelectedStory] = useState("");
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    insightsBooks()
      .then((res) => setBooks(res.data?.books || []))
      .catch(() => setBooks([]));
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await insightsCommentIntelligence(selectedStory || null, days);
        if (!cancelled) setData(res.data);
      } catch (err) {
        console.error("Failed to load comment intelligence", err);
        if (!cancelled) setError("Failed to load comment intelligence");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [selectedStory, days]);

  const sentimentBreakdown = data?.sentiment_breakdown || {};
  const totalSentiment = Object.values(sentimentBreakdown).reduce((s, v) => s + v, 0) || 1;

  const wordCloud = useMemo(() => data?.word_cloud || [], [data]);
  const maxWordCount = wordCloud.length ? Math.max(...wordCloud.map((w) => w.count)) : 1;

  const questions = data?.questions || [];
  const topContributors = data?.top_contributors || [];
  const chapterSentiment = data?.chapter_sentiment || [];
  const characterMentions = data?.character_mentions || [];

  const replyRate = data?.reply_rate;
  const replyRatePct = replyRate !== null && replyRate !== undefined ? (replyRate * 100).toFixed(0) : null;

  const formatNumber = (v) => {
    if (v === null || v === undefined) return "0";
    if (v >= 1000) return `${(v / 1000).toFixed(1)}k`;
    return v.toLocaleString();
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.card}>Loading…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.page}>
        <div className={styles.card}>{error}</div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <section className={styles.heroCard} style={{ marginBottom: 32 }}>
        <div className={styles.heroLeft}>
          <p className={styles.subhead}>Comment Intelligence</p>
          <h1 className={styles.title}>Feedback & Sentiment</h1>
          <p className={styles.heroSubtitle}>
            Understand what your readers are saying across {formatNumber(data?.total_comments)} comments.
          </p>
          <div style={{ display: "flex", gap: 16, marginTop: 16, flexWrap: "wrap" }}>
            <select value={selectedStory} onChange={(e) => setSelectedStory(e.target.value)} className={styles.cozySelect} style={{ minWidth: 240 }}>
              <option value="" style={{ background: "#ffffff", color: "#1a1612" }}>All Stories</option>
              {books.map((b) => (
                <option key={b.story_id} value={b.story_id} style={{ background: "#ffffff", color: "#1a1612" }}>
                  {b.title || `Story #${b.story_id}`}
                </option>
              ))}
            </select>
            <select value={days} onChange={(e) => setDays(Number(e.target.value))} className={styles.cozySelect}>
              <option value={7} style={{ background: "#ffffff", color: "#1a1612" }}>Last 7 days</option>
              <option value={30} style={{ background: "#ffffff", color: "#1a1612" }}>Last 30 days</option>
              <option value={90} style={{ background: "#ffffff", color: "#1a1612" }}>Last 90 days</option>
              <option value={365} style={{ background: "#ffffff", color: "#1a1612" }}>Last year</option>
            </select>
          </div>
        </div>
        <div className={styles.heroRight}>
          <div className={styles.heroCallout}>
            <span className={styles.heroBadge}>Reply Rate</span>
            <h3>{replyRatePct !== null ? `${replyRatePct}%` : "—"}</h3>
            <p>of comments you've replied to</p>
          </div>
        </div>
      </section>

      <section className={styles.metricsGrid}>
        {Object.entries(SENTIMENT_LABELS).map(([key, label]) => (
          <div
            key={key}
            className={styles.stationeryCard}
            style={{ borderLeft: `4px solid ${SENTIMENT_COLORS[key]}` }}
          >
            <div className={styles.pinNoteHeaderMark}>
              <span style={{ marginRight: 8 }}>❝</span>
              {label}
            </div>
            <div className={styles.metricValue}>{formatNumber(sentimentBreakdown[key] || 0)}</div>
            <div className={styles.stationeryTrend}>
              {((sentimentBreakdown[key] || 0) / totalSentiment * 100).toFixed(0)}% of comments
            </div>
          </div>
        ))}
      </section>

      <section className={styles.panelGrid}>
        <div className={`${styles.panelCard} ${styles.stationeryPinboard}`}>
          <div className={styles.sectionHeader}>
            <h2>Word Cloud</h2>
            <span className={styles.sectionMeta}>Most frequent words</span>
          </div>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 10,
              alignItems: "center",
              minHeight: 120,
            }}
          >
            {wordCloud.slice(0, 40).map((w) => {
              const size = 12 + (w.count / maxWordCount) * 20;
              const opacity = 0.5 + (w.count / maxWordCount) * 0.5;
              return (
                <span
                  key={w.word}
                  style={{
                    fontSize: size,
                    opacity,
                    fontWeight: w.count > maxWordCount * 0.5 ? 700 : 400,
                  }}
                  title={`${w.word}: ${w.count}`}
                >
                  {w.word}
                </span>
              );
            })}
            {!wordCloud.length && (
              <span style={{ color: "rgba(28,20,12,0.5)" }}>No words yet.</span>
            )}
          </div>
        </div>

        <div className={styles.scheduleCard}>
          <div className={styles.sectionHeader}>
            <h2>Top Contributors</h2>
            <span className={styles.sectionMeta}>Your superfans</span>
          </div>
          <div style={{ display: "grid", gap: 12 }}>
            {topContributors.map((c, i) => (
              <div
                key={c.user_id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "10px 0",
                  borderBottom: "1px solid rgba(28,20,12,0.08)",
                }}
              >
                <span
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    background: "rgba(232,201,110,0.3)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 700,
                    fontSize: 13,
                  }}
                >
                  {i + 1}
                </span>
                {c.profile_image ? (
                  <img
                    src={c.profile_image}
                    alt=""
                    style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover" }}
                  />
                ) : (
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: "50%",
                      background: "rgba(28,20,12,0.1)",
                    }}
                  />
                )}
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>{c.handle_name}</div>
                </div>
                <div style={{ fontWeight: 700 }}>{c.comment_count}</div>
              </div>
            ))}
            {!topContributors.length && (
              <div style={{ color: "rgba(28,20,12,0.5)" }}>No contributors yet.</div>
            )}
          </div>
        </div>
      </section>

      <section className={styles.bottomGrid}>
        <div className={`${styles.stationeryCard} ${styles.stationeryPinboard}`}>
          <div className={styles.sectionHeader}>
            <h2>Reader Questions</h2>
            <span className={styles.sectionMeta}>Comments ending in ?</span>
          </div>
          <div style={{ display: "grid", gap: 12, maxHeight: 300, overflowY: "auto" }}>
            {questions.slice(0, 10).map((q) => (
              <div
                key={q.comment_id}
                style={{
                  padding: 12,
                  background: "rgba(255,255,255,0.04)",
                  borderRadius: 12,
                  border: "1px solid rgba(28,20,12,0.06)",
                }}
              >
                <div style={{ fontSize: 14, marginBottom: 6 }}>{q.body}</div>
                <div style={{ fontSize: 12, color: "rgba(28,20,12,0.5)" }}>
                  — {q.user} {q.chapter_title ? `on "${q.chapter_title}"` : ""}
                </div>
              </div>
            ))}
            {!questions.length && (
              <div style={{ color: "rgba(28,20,12,0.5)" }}>No questions detected.</div>
            )}
          </div>
        </div>

        <div className={`${styles.stationeryCard} ${styles.stationeryPinboard}`}>
          <div className={styles.sectionHeader}>
            <h2>Character Mentions</h2>
            <span className={styles.sectionMeta}>Who readers talk about</span>
          </div>
          <div style={{ display: "grid", gap: 10 }}>
            {characterMentions.map((c) => (
              <div
                key={c.name}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "10px 0",
                  borderBottom: "1px solid rgba(28,20,12,0.08)",
                }}
              >
                <span style={{ fontWeight: 700, textTransform: "capitalize" }}>{c.name}</span>
                <span style={{ color: "rgba(28,20,12,0.7)" }}>{c.count} mentions</span>
              </div>
            ))}
            {!characterMentions.length && (
              <div style={{ color: "rgba(28,20,12,0.5)" }}>
                Add characters to your moodboard to track mentions.
              </div>
            )}
          </div>
        </div>
      </section>

      {chapterSentiment.length > 0 && (
        <section style={{ maxWidth: 1280, margin: "32px auto 0" }}>
          <div className={styles.panelCard}>
            <div className={styles.sectionHeader}>
              <h2>Chapter Sentiment</h2>
              <span className={styles.sectionMeta}>Emotional breakdown by chapter</span>
            </div>
            <div style={{ overflowX: "auto" }}>
              <div style={{ display: "flex", gap: 16, minWidth: chapterSentiment.length * 80 }}>
                {chapterSentiment.map((ch) => {
                  const total = ch.total || 1;
                  return (
                    <div
                      key={ch.chapter_id}
                      style={{
                        flex: "0 0 70px",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                      }}
                    >
                      <div
                        style={{
                          width: 50,
                          height: 100,
                          borderRadius: 8,
                          overflow: "hidden",
                          display: "flex",
                          flexDirection: "column",
                          border: "1px solid rgba(28,20,12,0.1)",
                        }}
                      >
                        {["hype", "emotional", "analytical", "critic", "neutral"].map((s) => (
                          <div
                            key={s}
                            style={{
                              height: `${(ch[s] / total) * 100}%`,
                              background: SENTIMENT_COLORS[s],
                              minHeight: ch[s] ? 2 : 0,
                            }}
                            title={`${SENTIMENT_LABELS[s]}: ${ch[s]}`}
                          />
                        ))}
                      </div>
                      <div
                        style={{
                          marginTop: 8,
                          fontSize: 11,
                          textAlign: "center",
                          maxWidth: 70,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                        title={ch.title}
                      >
                        Ch {ch.order_index + 1}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div style={{ display: "flex", gap: 16, marginTop: 16, flexWrap: "wrap" }}>
              {Object.entries(SENTIMENT_LABELS).map(([key, label]) => (
                <div key={key} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: 3,
                      background: SENTIMENT_COLORS[key],
                    }}
                  />
                  <span style={{ fontSize: 12 }}>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

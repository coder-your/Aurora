import React, { useEffect, useState } from "react";
import { insightsSuccessScore, insightsBooks } from "../services/insightsService";
import styles from "../styles/writerInsights.module.css";

const CONDITION_COLORS = {
  Sunny: "#4ade80",
  "Partly Cloudy": "#a3e635",
  Cloudy: "#fbbf24",
  Overcast: "#fb923c",
  Stormy: "#f87171",
};

const CONDITION_ICONS = {
  Sunny: "☀️",
  "Partly Cloudy": "⛅",
  Cloudy: "☁️",
  Overcast: "🌥️",
  Stormy: "⛈️",
};

export default function WriterSuccessScore() {
  const [books, setBooks] = useState([]);
  const [selectedStory, setSelectedStory] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    insightsBooks()
      .then((res) => {
        const list = res.data?.books || [];
        setBooks(list);
        if (list.length && !selectedStory) {
          setSelectedStory(String(list[0].story_id));
        }
      })
      .catch(() => setBooks([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedStory) {
      setData(null);
      return;
    }
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await insightsSuccessScore(selectedStory);
        if (!cancelled) setData(res.data);
      } catch (err) {
        console.error("Failed to load success score", err);
        if (!cancelled) setError("Failed to load success score");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [selectedStory]);

  const formatNumber = (v) => {
    if (v === null || v === undefined) return "0";
    if (v >= 1000) return `${(v / 1000).toFixed(1)}k`;
    return v.toLocaleString();
  };

  const formatPercent = (v) => {
    if (v === null || v === undefined) return "—";
    return `${(v * 100).toFixed(0)}%`;
  };

  const renderGauge = (score) => {
    const pct = Math.min(100, Math.max(0, score));
    return (
      <div style={{ position: "relative", width: 180, height: 100, margin: "0 auto" }}>
        <svg viewBox="0 0 180 100" style={{ width: "100%", height: "100%" }}>
          <path
            d="M 10 90 A 80 80 0 0 1 170 90"
            fill="none"
            stroke="rgba(28,20,12,0.1)"
            strokeWidth="16"
            strokeLinecap="round"
          />
          <path
            d="M 10 90 A 80 80 0 0 1 170 90"
            fill="none"
            stroke={CONDITION_COLORS[data?.condition] || "#94a3b8"}
            strokeWidth="16"
            strokeLinecap="round"
            strokeDasharray={`${(pct / 100) * 251.2} 251.2`}
          />
        </svg>
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: "50%",
            transform: "translateX(-50%)",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 32, fontWeight: 700 }}>{score}</div>
          <div style={{ fontSize: 12, color: "rgba(28,20,12,0.6)" }}>Viral Score</div>
        </div>
      </div>
    );
  };

  if (!books.length) {
    return (
      <div className={styles.page}>
        <div className={styles.card}>No stories found. Create a story first.</div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <section className={styles.heroCard} style={{ marginBottom: 32 }}>
        <div className={styles.heroLeft}>
          <p className={styles.subhead}>Predictive Success Score</p>
          <h1 className={styles.title}>Viral Potential</h1>
          <p className={styles.heroSubtitle}>
            Forecast how your story will perform based on early engagement signals.
          </p>
          <div style={{ marginTop: 16 }}>
            <select value={selectedStory} onChange={(e) => setSelectedStory(e.target.value)} className={styles.cozySelect} style={{ minWidth: 240 }}>
              {books.map((b) => (
                <option key={b.story_id} value={b.story_id}>
                  {b.title || `Story #${b.story_id}`}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className={styles.heroRight}>
          {data && (
            <div
              className={styles.stationeryCard}
              style={{ textAlign: "center", minWidth: 220, background: "rgba(255,253,248,0.78)" }}
            >
              <div style={{ fontSize: 48, marginBottom: 8 }}>{CONDITION_ICONS[data.condition] || "🌤️"}</div>
              <span className={styles.heroBadge} style={{ color: CONDITION_COLORS[data.condition] }}>
                {data.condition}
              </span>
              <p style={{ marginTop: 8, fontSize: 13, color: "rgba(28,20,12,0.62)" }}>Growth Potential</p>
            </div>
          )}
        </div>
      </section>

      {loading && (
        <div className={styles.card} style={{ textAlign: "center", padding: 40 }}>
          Loading…
        </div>
      )}

      {error && (
        <div className={styles.card} style={{ textAlign: "center", padding: 40 }}>
          {error}
        </div>
      )}

      {data && !loading && (
        <>
          <section className={styles.metricsGrid}>
            <div className={styles.stationeryCard} style={{ gridColumn: "span 2", padding: 22 }}>
              {renderGauge(data.viral_score)}
            </div>
            <div className={styles.stationeryCard}>
              <div className={styles.metricLabel}>Total Readers</div>
              <div className={styles.metricValue}>{formatNumber(data.total_readers)}</div>
              <div className={styles.metricTrend}>in {data.story_age_days} days</div>
            </div>
            <div className={styles.stationeryCard}>
              <div className={styles.metricLabel}>Total Likes</div>
              <div className={styles.metricValue}>{formatNumber(data.total_likes)}</div>
            </div>
            <div className={styles.stationeryCard}>
              <div className={styles.metricLabel}>Total Comments</div>
              <div className={styles.metricValue}>{formatNumber(data.total_comments)}</div>
            </div>
            <div className={styles.stationeryCard}>
              <div className={styles.metricLabel}>Total Shares</div>
              <div className={styles.metricValue}>{formatNumber(data.total_shares)}</div>
            </div>
          </section>

          <section className={styles.panelGrid}>
            <div className={styles.panelCard}>
              <div className={styles.sectionHeader}>
                <h2>Score Breakdown</h2>
                <span className={styles.sectionMeta}>What's driving your score</span>
              </div>
              <div style={{ display: "grid", gap: 16 }}>
                <ScoreBar
                  label="Hook Score"
                  score={data.hook?.score || 0}
                  detail={`Ch1 Retention: ${formatPercent(data.hook?.ch1_retention)}`}
                />
                <ScoreBar
                  label="Stickiness"
                  score={data.stickiness?.score || 0}
                  detail={`Return Rate: ${formatPercent(data.stickiness?.return_rate)}`}
                />
                <ScoreBar
                  label="Engagement Intensity"
                  score={data.engagement_intensity?.score || 0}
                  detail={`Share Ratio: ${formatPercent(data.engagement_intensity?.share_to_read_ratio)}`}
                />
                <ScoreBar
                  label="Sentiment Momentum"
                  score={data.sentiment_momentum?.score || 0}
                  detail={`Trend: ${data.sentiment_momentum?.trend || "neutral"}`}
                />
              </div>
            </div>

            <div className={styles.scheduleCard}>
              <div className={styles.sectionHeader}>
                <h2>Forecast</h2>
                <span className={styles.sectionMeta}>Where you're headed</span>
              </div>
              <div
                style={{
                  padding: 20,
                  background: "rgba(255,255,255,0.04)",
                  borderRadius: 16,
                  marginBottom: 20,
                }}
              >
                <p style={{ fontSize: 15, lineHeight: 1.6 }}>{data.forecast?.message}</p>
              </div>

              <div className={styles.sectionHeader} style={{ marginTop: 24 }}>
                <h2>Levers</h2>
                <span className={styles.sectionMeta}>Actions to boost your score</span>
              </div>
              <div style={{ display: "grid", gap: 12 }}>
                {data.levers?.map((lever, i) => (
                  <div
                    key={i}
                    style={{
                      padding: 14,
                      background: "rgba(232,201,110,0.08)",
                      borderRadius: 12,
                      border: "1px solid rgba(232,201,110,0.2)",
                    }}
                  >
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>{lever.action}</div>
                    <div style={{ fontSize: 13, color: "rgba(28,20,12,0.6)" }}>
                      {lever.impact}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function ScoreBar({ label, score, detail }) {
  const pct = Math.min(100, Math.max(0, score));
  const color =
    pct >= 70 ? "#4ade80" : pct >= 50 ? "#a3e635" : pct >= 30 ? "#fbbf24" : "#f87171";

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontWeight: 600 }}>{label}</span>
        <span style={{ fontWeight: 700 }}>{score}</span>
      </div>
      <div
        style={{
          height: 8,
          borderRadius: 4,
          background: "rgba(28,20,12,0.08)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            background: color,
            borderRadius: 4,
            transition: "width 0.3s ease",
          }}
        />
      </div>
      <div style={{ fontSize: 12, color: "rgba(28,20,12,0.5)", marginTop: 4 }}>{detail}</div>
    </div>
  );
}

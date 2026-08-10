import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  insightsAudience,
  insightsBooks,
  insightsEngagement,
  insightsOverview,
} from "../services/insightsService";
import styles from "../styles/writerInsights.module.css";

export default function WriterInsights() {
  const [overview, setOverview] = useState(null);
  const [books, setBooks] = useState(null);
  const [audience, setAudience] = useState(null);
  const [engagement, setEngagement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [o, b, a, e] = await Promise.all([
          insightsOverview(),
          insightsBooks(),
          insightsAudience(),
          insightsEngagement(),
        ]);
        if (cancelled) return;
        setOverview(o.data);
        setBooks(b.data);
        setAudience(a.data);
        setEngagement(e.data);
      } catch (err) {
        console.error("Failed to load writer insights", err);
        if (!cancelled) setError("Failed to load writer insights");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const bookList = useMemo(() => books?.books || [], [books]);

  const topBook = useMemo(() => {
    if (!bookList.length) return null;
    return [...bookList].sort((a, b) => (b.reads ?? 0) - (a.reads ?? 0))[0];
  }, [bookList]);

  const greetingName = overview?.display_name || overview?.writer_name || "Creator";

  const formatNumber = (value) => {
    if (value === null || value === undefined) return "0";
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
    return value.toLocaleString();
  };

  const formatPercent = (value) => {
    if (value === null || value === undefined) return "—";
    return `${(value * 100).toFixed(1)}%`;
  };

  const formatDelta = (value) => {
    if (value === null || value === undefined) return "—";
    const pct = value * 100;
    const sign = pct > 0 ? "+" : "";
    return `${sign}${pct.toFixed(0)}%`;
  };

  const audienceSeries = useMemo(() => {
    const series = audience?.gained_series || [];
    if (!series.length) {
      return [
        { label: "Day -2", value: 0 },
        { label: "Day -1", value: 0 },
        { label: "Today", value: 0 },
      ];
    }
    return series.slice(-6).map((point) => ({
      label: new Date(point.day).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      value: point.gained,
    }));
  }, [audience]);

  const chartMax = audienceSeries.reduce((max, bar) => Math.max(max, bar.value || 0), 0) || 1;

  const engagementTotals = engagement?.totals || {};
  const engagementRatios = engagement?.ratios || {};

  const heatmapPoints = useMemo(() => {
    const points = overview?.reading_activity_heatmap || [];
    if (!Array.isArray(points)) return [];
    return points;
  }, [overview]);

  const heatmapLastDays = useMemo(() => {
    const days = 28;
    const end = new Date();
    end.setUTCHours(0, 0, 0, 0);
    const start = new Date(end.getTime() - (days - 1) * 24 * 60 * 60 * 1000);

    const map = new Map((heatmapPoints || []).map((p) => [p.day, p]));
    const out = [];
    for (let i = 0; i < days; i += 1) {
      const d = new Date(start.getTime() + i * 24 * 60 * 60 * 1000);
      const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
      const row = map.get(key);
      out.push({
        day: key,
        minutes: Number(row?.minutes) || 0,
        readers: Number(row?.readers) || 0,
      });
    }
    return out;
  }, [heatmapPoints]);

  const heatmapMax = heatmapLastDays.reduce((m, d) => Math.max(m, d.minutes || 0), 0) || 1;

  const topGenres = useMemo(() => {
    const rows = audience?.top_genres || [];
    if (!Array.isArray(rows)) return [];
    return rows;
  }, [audience]);

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
      <section className={styles.heroCard}>
        <div className={styles.heroLeft}>
          <p className={styles.subhead}>Writer insights</p>
          <h1 className={styles.title}>Hello there, {greetingName}</h1>
          <p className={styles.heroSubtitle}>
            Tracking performance across {formatNumber(overview?.stories_total)} stories in the last{" "}
            {overview?.range_days || 30} days.
          </p>
          <div className={styles.heroStats}>
            <div>
              <span className={styles.heroStatLabel}>Followers</span>
              <strong>{formatNumber(overview?.followers_total)}</strong>
            </div>
            <div>
              <span className={styles.heroStatLabel}>Reads (30d)</span>
              <strong>{formatNumber(overview?.reads_recent)}</strong>
            </div>
            <div>
              <span className={styles.heroStatLabel}>Likes (30d)</span>
              <strong>{formatNumber(overview?.likes_total)}</strong>
            </div>
          </div>
          <div className={styles.stickyNoteWall} style={{ marginTop: 20 }}>
            <Link to="/writer-insights/comments" className={styles.stickyNoteLink}>
              <span className={styles.stickyNoteQuote}>❝</span>
              <span className={styles.stickyNoteMain}>
                <div className={styles.stickyNoteTitle}>Comment Intelligence</div>
                <div className={styles.stickyNoteSubtitle}>Reader sentiment & feedback highlights</div>
              </span>
              <span className={styles.stickyNoteIcon}>💬</span>
            </Link>

            <Link to="/writer-insights/success-score" className={styles.stickyNoteLink} style={{ transform: "rotate(0.45deg)" }}>
              <span className={styles.stickyNoteQuote}>❞</span>
              <span className={styles.stickyNoteMain}>
                <div className={styles.stickyNoteTitle}>Success Score</div>
                <div className={styles.stickyNoteSubtitle}>Viral potential & growth levers</div>
              </span>
              <span className={styles.stickyNoteIcon}>🚀</span>
            </Link>
          </div>
        </div>
        <div className={styles.heroRight}>
          <div className={styles.heroCallout}>
            <span className={styles.heroBadge}>Top performer</span>
            <h3>{topBook?.title || "No stories yet"}</h3>
            <p>
              {formatNumber(topBook?.reads ?? 0)} reads · {formatNumber(topBook?.likes ?? 0)} likes ·{" "}
              {formatNumber(topBook?.comments ?? 0)} comments
            </p>
            {topBook && (
              <Link
                to={`/books/${topBook.story_id}/chapters`}
                className={styles.linkButton}
                style={{ textDecoration: "none" }}
              >
                View book →
              </Link>
            )}
          </div>
        </div>
      </section>

      <section className={styles.metricsGrid}>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Followers</div>
          <div className={styles.metricValue}>{formatNumber(overview?.followers_total)}</div>
          <div className={styles.metricTrend}>+{formatNumber(overview?.followers_gained || 0)} this period</div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Engagement rate</div>
          <div className={styles.metricValue}>
            {formatPercent(engagementRatios.likes_to_reads) || formatPercent(0)}
          </div>
          <div className={styles.metricTrend}>likes per read</div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Shares</div>
          <div className={styles.metricValue}>{formatNumber(engagementTotals.shares)}</div>
          <div className={styles.metricTrend}>overall shares all time</div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Stories published</div>
          <div className={styles.metricValue}>{formatNumber(overview?.stories_published)}</div>
          <div className={styles.metricTrend}>
            {formatNumber(overview?.stories_total)} total stories
          </div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Completion rate</div>
          <div className={styles.metricValue}>{formatPercent(overview?.completion_rate)}</div>
          <div className={styles.metricTrend}>readers reaching the end</div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Reading minutes (period)</div>
          <div className={styles.metricValue}>{formatNumber(overview?.reading_minutes_recent || 0)}</div>
          <div className={styles.metricTrend}>{formatDelta(overview?.reading_minutes_delta_percent)} vs previous</div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Library saves</div>
          <div className={styles.metricValue}>{formatNumber(overview?.saves_recent || 0)}</div>
          <div className={styles.metricTrend}>{formatDelta(overview?.saves_delta_percent)} vs previous</div>
        </div>
      </section>

      <section className={styles.panelGrid}>
        <div className={styles.panelCard}>
          <div className={styles.sectionHeader}>
            <div>
              <h2>Audience movement</h2>
              <p>Followers gained per day</p>
            </div>
            <button className={styles.iconButton} aria-label="Open chart actions">
              ↗
            </button>
          </div>
          <div className={styles.chart}>
            {audienceSeries.map((bar) => (
              <div key={bar.label} className={styles.chartColumn}>
                <div className={styles.barTrack}>
                  <div
                    className={styles.barFill}
                    style={{ height: `${(Math.min(bar.value || 0, chartMax) / chartMax) * 100}%` }}
                  />
                </div>
                <span className={styles.barLabel}>{bar.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.scheduleCard}>
          <div className={styles.sectionHeader}>
            <h2>Engagement mix</h2>
            <span className={styles.sectionMeta}>Totals + ratios</span>
          </div>
          <div className={styles.engagementGrid}>
            <div>
              <p className={styles.scheduleTitle}>Reads</p>
              <p className={styles.scheduleMeta}>{formatNumber(engagementTotals.reads)}</p>
            </div>
            <div>
              <p className={styles.scheduleTitle}>Likes</p>
              <p className={styles.scheduleMeta}>{formatNumber(engagementTotals.likes)}</p>
            </div>
            <div>
              <p className={styles.scheduleTitle}>Comments</p>
              <p className={styles.scheduleMeta}>{formatNumber(engagementTotals.comments)}</p>
            </div>
            <div>
              <p className={styles.scheduleTitle}>Shares</p>
              <p className={styles.scheduleMeta}>{formatNumber(engagementTotals.shares)}</p>
            </div>
          </div>
          <div className={styles.ratioList}>
            <div className={styles.ratioItem}>
              <span>Likes per read</span>
              <strong>{formatPercent(engagementRatios.likes_to_reads)}</strong>
            </div>
            <div className={styles.ratioItem}>
              <span>Comments per read</span>
              <strong>{formatPercent(engagementRatios.comments_to_reads)}</strong>
            </div>
            <div className={styles.ratioItem}>
              <span>Shares per read</span>
              <strong>{formatPercent(engagementRatios.shares_to_reads)}</strong>
            </div>
            <div className={styles.ratioItem}>
              <span>Follower conversion</span>
              <strong>{formatPercent(engagementRatios.follower_conversion_rate)}</strong>
            </div>
            <div className={styles.ratioItem}>
              <span>Avg minutes per reader</span>
              <strong>
                {engagementRatios.avg_reading_minutes_per_reader === null || engagementRatios.avg_reading_minutes_per_reader === undefined
                  ? "—"
                  : engagementRatios.avg_reading_minutes_per_reader.toFixed(1)}
              </strong>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.bottomGrid} style={{ marginTop: 24 }}>
        <div className={styles.detailCard}>
          <div className={styles.sectionHeader}>
            <h2>Activity heatmap</h2>
            <span className={styles.sectionMeta}>Minutes read (last 28 days)</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 8 }}>
            {heatmapLastDays.map((d) => {
              const strength = Math.min(1, (d.minutes || 0) / heatmapMax);
              const bg = `rgba(232, 201, 110, ${0.12 + strength * 0.55})`;
              return (
                <div
                  key={d.day}
                  title={`${d.day}: ${d.minutes} minutes • ${d.readers} readers`}
                  style={{
                    height: 18,
                    borderRadius: 6,
                    background: bg,
                    border: "1px solid rgba(28, 20, 12, 0.08)",
                  }}
                />
              );
            })}
          </div>
        </div>

        <div className={styles.tableCard}>
          <div className={styles.sectionHeader}>
            <h2>Reader persona</h2>
            <span className={styles.sectionMeta}>Top genres your readers also enjoy</span>
          </div>
          <div style={{ display: "grid", gap: 10 }}>
            {topGenres.length ? (
              topGenres.map((g) => (
                <div
                  key={g.category}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    borderBottom: "1px solid rgba(28, 20, 12, 0.08)",
                    paddingBottom: 10,
                  }}
                >
                  <span style={{ fontWeight: 700 }}>{g.category}</span>
                  <span style={{ color: "rgba(28, 20, 12, 0.7)" }}>{formatNumber(g.count)}</span>
                </div>
              ))
            ) : (
              <div className={styles.emptyState}>Not enough reader history yet.</div>
            )}
          </div>
        </div>
      </section>

      <section className={styles.bottomGrid}>
        <div className={styles.detailCard}>
          <div className={styles.sectionHeader}>
            <h2>Performance snapshot</h2>
            <span className={styles.sectionMeta}>Totals & recents</span>
          </div>
          <div className={styles.snapshotGrid}>
            <div>
              <span>Reads</span>
              <strong>{formatNumber(overview?.reads_total)}</strong>
              <em>{formatNumber(overview?.reads_recent)} last 30d</em>
            </div>
            <div>
              <span>Likes</span>
              <strong>{formatNumber(overview?.likes_total)}</strong>
              <em>{formatNumber(engagementTotals.likes)} lifetime</em>
            </div>
            <div>
              <span>Comments</span>
              <strong>{formatNumber(overview?.comments_total)}</strong>
              <em>{formatNumber(engagementTotals.comments)} engagement</em>
            </div>
            <div>
              <span>Shares</span>
              <strong>{formatNumber(overview?.shares_total)}</strong>
              <em>{formatNumber(engagementTotals.shares)} lifetime</em>
            </div>
          </div>
        </div>

        <div className={styles.tableCard}>
          <div className={styles.sectionHeader}>
            <h2>Books</h2>
            <Link to="/writer" className={styles.linkButton} style={{ textDecoration: "none" }}>See all</Link>
          </div>
          <div className={styles.table}>
            <div className={styles.tableHeader}>
              <div>Title</div>
              <div>Reads</div>
              <div>Likes</div>
              <div>Comments</div>
            </div>
            {bookList.map((b) => (
              <div key={b.story_id} className={styles.tableRow}>
                <div className={styles.bookTitle} title={b.title || `Story #${b.story_id}`}>
                  {b.title || `Story #${b.story_id}`}
                </div>
                <div>{formatNumber(b.reads ?? 0)}</div>
                <div>{formatNumber(b.likes ?? 0)}</div>
                <div>{formatNumber(b.comments ?? 0)}</div>
              </div>
            ))}
            {bookList.length === 0 && <div className={styles.emptyState}>No books found.</div>}
          </div>
        </div>
      </section>
    </div>
  );
}

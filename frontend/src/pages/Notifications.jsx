import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { listNotifications, markAllAsRead, markAsRead } from "../services/notificationService";
import styles from "../styles/notifications.module.css";

export default function Notifications() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [markingAll, setMarkingAll] = useState(false);
  const [selectedTab, setSelectedTab] = useState("today");

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listNotifications({ limit: 50, skip: 0 });
      setItems(res.data?.notifications || []);
    } catch (e) {
      console.error("Failed to load notifications", e);
      setError("Failed to load notifications");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleMarkAll = async () => {
    setMarkingAll(true);
    try {
      await markAllAsRead();
      await load();
      window.dispatchEvent(new Event("notifications-updated"));
    } catch (e) {
      console.error("markAllAsRead failed", e);
    } finally {
      setMarkingAll(false);
    }
  };

  const handleMarkOne = async (id) => {
    try {
      await markAsRead(id);
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
      window.dispatchEvent(new Event("notifications-updated"));
    } catch (e) {
      console.error("markAsRead failed", e);
    }
  };

  const formatActor = (actor) => {
    if (!actor) return "Someone";
    if (actor.profile?.handle_name) return `@${actor.profile.handle_name}`;
    const parts = [actor.first_name, actor.last_name].filter(Boolean);
    return parts.length ? parts.join(" ") : "Someone";
  };

  const storyLabel = (data) => {
    if (!data) return "your story";
    if (data.storyTitle) return `“${data.storyTitle}”`;
    return "your story";
  };

  const renderTitle = (n) => {
    if (n.type === "new_follower") return "New follower";
    if (n.type === "writer_post") return "New writer post";
    if (n.type === "milestone") return "Milestone reached";
    if (n.type === "review") return "New review";
    if (n.type === "comment") return "New comment";
    if (n.type === "reply" || n.type === "comment_reply") return "New reply";
    if (n.type === "comment_reaction") return "New reaction";
    if (n.type === "mention") return "You were mentioned";
    return "Notification";
  };

  const renderBody = (n) => {
    const data = n.data || {};
    if (n.type === "milestone") {
      if (!data) return null;
      const title = data.title || "Milestone";
      const metric = data.metric || "goal";
      const threshold = data.threshold ?? "?";
      return `${title} hit ${threshold} ${metric}`;
    }
    if (n.type === "comment") {
      const snippet = data.preview ? `“${data.preview}”` : "";
      const chapter = data.chapterTitle ? ` • ${data.chapterTitle}` : "";
      return `${formatActor(n.actor)} commented on ${storyLabel(data)}${chapter} ${snippet}`.trim();
    }
    if (n.type === "reply" || n.type === "comment_reply") {
      const snippet = data.preview ? `“${data.preview}”` : "";
      return `${formatActor(n.actor)} replied to your comment on ${storyLabel(data)} ${snippet}`.trim();
    }
    if (n.type === "review") {
      const rating = data.rating ? `${data.rating}★` : "";
      const snippet = data.preview ? `“${data.preview}”` : "";
      return `${formatActor(n.actor)} left a ${rating} review on ${storyLabel(data)} ${snippet}`.trim();
    }
    if (n.type === "mention") {
      return `${formatActor(n.actor)} mentioned you`;
    }
    return data?.body || data?.text || null;
  };

  const openNotificationTarget = async (n) => {
    if (!n) return;
    const data = n.data || {};
    let navigated = false;

    const isCommentThread = n.type === "comment" || n.type === "reply" || n.type === "comment_reply";
    if (isCommentThread && data.storyId) {
      const state = {};
      const commentId = data.replyId || data.commentId || null;
      if (data.chapterId) {
        state.commentLink = {
          storyId: data.storyId,
          chapterId: data.chapterId,
          commentId,
        };
        navigate(`/read/${data.storyId}`, { state });
        navigated = true;
      } else {
        state.highlightReviewId = commentId;
        navigate(`/story/${data.storyId}`, { state });
        navigated = true;
      }
    } else if (n.type === "review") {
      if (data.storyId) {
        const state = { highlightReviewId: data.reviewId || null };
        navigate(`/story/${data.storyId}`, { state });
        navigated = true;
      }
    } else if (n.type === "milestone" && data.storyId) {
      navigate(`/writer-insights`);
      navigated = true;
    }
    return navigated;
  };

  const handleItemClick = async (n) => {
    const navigated = await openNotificationTarget(n);
    if (!n.is_read) {
      await handleMarkOne(n.id);
    }
    if (navigated) {
      window.dispatchEvent(new Event("notifications-updated"));
    }
  };

  const categorizeNotifications = useMemo(() => {
    const now = new Date();
    const today = [];
    const thisWeek = [];
    const earlier = [];
    items.forEach((n) => {
      const created = new Date(n.created_at);
      const sameDay =
        created.getFullYear() === now.getFullYear() &&
        created.getMonth() === now.getMonth() &&
        created.getDate() === now.getDate();
      const diffDays = Math.floor((now - created) / (1000 * 60 * 60 * 24));
      if (sameDay) {
        today.push(n);
      } else if (diffDays < 7) {
        thisWeek.push(n);
      } else {
        earlier.push(n);
      }
    });
    return { today, week: thisWeek, earlier };
  }, [items]);

  const tabs = [
    { key: "today", label: "Today", count: categorizeNotifications.today.length },
    { key: "week", label: "This Week", count: categorizeNotifications.week.length },
    { key: "earlier", label: "Earlier", count: categorizeNotifications.earlier.length },
  ];

  const activeItems = categorizeNotifications[selectedTab] || [];

  const formatTimeAgo = (dateString) => {
    const now = Date.now();
    const value = new Date(dateString).getTime();
    const diffMinutes = Math.floor((now - value) / (1000 * 60));
    if (diffMinutes < 1) return "just now";
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return new Date(value).toLocaleDateString();
  };

  const renderAvatar = (n) => {
    const actor = n.actor;
    const image = actor?.profile?.profile_image;
    const initials = (() => {
      if (!actor) return "U";
      const first = actor.first_name?.[0] || "";
      const last = actor.last_name?.[0] || "";
      if (first || last) return `${first}${last}`.toUpperCase();
      if (actor.profile?.handle_name) return actor.profile.handle_name[0].toUpperCase();
      return "U";
    })();
    if (image) {
      return <img src={image} alt={formatActor(actor)} />;
    }
    return <span>{initials}</span>;
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
      <div className={styles.shell}>
        <div className={styles.headerRow}>
          <div>
            <p className={styles.subtitle}>You have {items.length} notifications</p>
            <h1 className={styles.title}>Notification Center</h1>
          </div>
          <button className={styles.actionBtn} onClick={handleMarkAll} disabled={markingAll}>
            {markingAll ? "Marking…" : "Mark all as read"}
          </button>
        </div>

        <div className={styles.tabs}>
          {tabs.map((tab) => (
            <button
              key={tab.key}
              className={`${styles.tab} ${selectedTab === tab.key ? styles.activeTab : ""}`}
              onClick={() => setSelectedTab(tab.key)}
              type="button"
            >
              <span>{tab.label}</span>
              <span className={styles.tabCount}>{tab.count}</span>
            </button>
          ))}
        </div>

        <div className={styles.list}>
          {activeItems.length === 0 ? (
            <div className={styles.empty}>No notifications in this period.</div>
          ) : (
            activeItems.map((n) => (
              <div
                key={n.id}
                className={`${styles.item} ${styles.clickable} ${n.is_read ? styles.read : styles.unread}`}
                role="button"
                tabIndex={0}
                onClick={() => handleItemClick(n)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleItemClick(n);
                  }
                }}
              >
                <div className={styles.avatar}>{renderAvatar(n)}</div>
                <div className={styles.itemContent}>
                  <div className={styles.itemHeader}>
                    <div>
                      <div className={styles.itemTitle}>{renderTitle(n)}</div>
                      {renderBody(n) && <div className={styles.itemBody}>{renderBody(n)}</div>}
                    </div>
                    <div className={styles.itemMeta}>{formatTimeAgo(n.created_at)}</div>
                  </div>
                  {!n.is_read && (
                    <button
                      className={styles.smallBtn}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMarkOne(n.id);
                      }}
                    >
                      Mark read
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

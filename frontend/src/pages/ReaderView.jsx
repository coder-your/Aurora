import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  getStoryIntro,
  openReading,
  updateProgress,
  addBookmark,
  getBookmarks,
  deleteBookmark,
  addReadingSession,
  getChapterPreview,
} from "../services/readingApi";
import {
  createChapterComment,
  deleteComment,
  getChapterEngagement,
  likeChapter,
  listChapterComments,
  reportComment,
  reactToComment,
  removeCommentReaction,
  replyToComment,
  shareChapter,
  unlikeChapter,
} from "../services/engagementService";
import { getMyProfile } from "../services/profileService";
import styles from "../styles/readerView.module.css";
import DictionaryTooltip from "../components/DictionaryTooltip";
import PlotTwistSubmissionPanel from "../components/PlotTwistSubmissionPanel";
import { getChapterCredits } from "../services/auroraCardsService";

import plotStyles from "../styles/plotTwist.module.css";

export default function ReaderView() {
  const { storyId } = useParams();
  const navigate = useNavigate();

  const [intro, setIntro] = useState(null);
  const [chapter, setChapter] = useState(null);
  const [position, setPosition] = useState(0);
  const [bookmarks, setBookmarks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [bookmarkToast, setBookmarkToast] = useState("");
  const [selectedWord, setSelectedWord] = useState("");
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 });

  const [chapterLiked, setChapterLiked] = useState(false);
  const [likeBusy, setLikeBusy] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentBusy, setCommentBusy] = useState(false);
  const [commentWarning, setCommentWarning] = useState("");

  const [engagementOpen, setEngagementOpen] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [commentCount, setCommentCount] = useState(0);
  const [shareCount, setShareCount] = useState(0);
  const [myUserId, setMyUserId] = useState(null);
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [replyBusy, setReplyBusy] = useState(false);
  const [replyWarning, setReplyWarning] = useState("");
  const [shareOpen, setShareOpen] = useState(false);
  const [reportToast, setReportToast] = useState("");
  const [plotCredits, setPlotCredits] = useState(null);

  const storyAuthorId = intro?.author?.id ?? null;

  // Reader appearance settings
  const [fontSize, setFontSize] = useState("medium");
  const [fontFamily, setFontFamily] = useState("serif");
  const [boldText, setBoldText] = useState(false);
  const [theme, setTheme] = useState("light");
  const [lineSpacing, setLineSpacing] = useState("normal");

  const progressSaveTimer = useRef(null);
  const readingTickTimer = useRef(null);

  const story_id = Number(storyId);

  // Load saved reader settings from localStorage
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem("aurora_reader_settings");
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed.fontSize) setFontSize(parsed.fontSize);
      if (parsed.fontFamily) setFontFamily(parsed.fontFamily);
      if (typeof parsed.boldText === "boolean") setBoldText(parsed.boldText);
      if (parsed.theme) setTheme(parsed.theme);
      if (parsed.lineSpacing) setLineSpacing(parsed.lineSpacing);
    } catch (e) {
      console.warn("Failed to load reader settings", e);
    }
  }, []);

  // Persist reader settings when they change
  useEffect(() => {
    try {
      const toSave = {
        fontSize,
        fontFamily,
        boldText,
        theme,
        lineSpacing,
      };
      window.localStorage.setItem("aurora_reader_settings", JSON.stringify(toSave));
    } catch (e) {
      console.warn("Failed to save reader settings", e);
    }
  }, [fontSize, fontFamily, boldText, theme, lineSpacing]);

  // Load initial data
  useEffect(() => {
    const loadInitial = async () => {
      try {
        setLoading(true);
        const introRes = await getStoryIntro(story_id);
        const story = introRes.data?.story;
        setIntro(story);

        const openRes = await openReading(story_id);
        const openData = openRes.data || {};
        const openChapter = openData.chapter || null;
        const startPosition = Number(openData.position) || 0;

        if (openChapter?.chapter_id) {
          setChapter({
            chapter_id: openChapter.chapter_id,
            title: openChapter.title || story?.chapters?.find((c) => c.chapter_id === openChapter.chapter_id)?.title || "",
            content_html: openChapter.content_html || "",
            content_raw: openChapter.content_raw || "",
            order_index:
              openChapter.order_index ??
              story?.chapters?.find((c) => c.chapter_id === openChapter.chapter_id)?.order_index ??
              0,
          });
          setPosition(startPosition);

          window.setTimeout(() => {
            const container = document.getElementById("reader-scroll-container");
            if (container) container.scrollTop = startPosition;
          }, 0);
        } else if (story?.chapters?.[0]?.chapter_id) {
          await handleChapterClick(story.chapters[0].chapter_id, { startPosition: 0, storyMeta: story });
        }

        const bookmarksRes = await getBookmarks(story_id);
        setBookmarks(bookmarksRes.data || []);

        const profileRes = await getMyProfile();
        setMyUserId(profileRes.data?.user_id || null);
      } catch (err) {
        console.error("Failed to load initial data:", err);
        setError(err.message || "Failed to load story");
      } finally {
        setLoading(false);
      }
    };

    if (story_id) loadInitial();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [story_id]);

  const handleChapterClick = async (chapterId, { startPosition = 0, storyMeta = null } = {}) => {
    try {
      const previewRes = await getChapterPreview(chapterId);
      const preview = previewRes.data || {};

      const metaSource = storyMeta || intro;
      const meta = metaSource?.chapters?.find((c) => c.chapter_id === chapterId);
      setChapter({
        chapter_id: chapterId,
        title: meta?.title || chapter?.title || "",
        content_html: preview.html,
        content_raw: preview.raw,
        order_index: meta?.order_index ?? chapter?.order_index ?? 0,
      });

      const tryScroll = () => {
        const container = document.getElementById("reader-scroll-container");
        if (container) {
          container.scrollTop = startPosition;
          return true;
        }
        return false;
      };

      if (!tryScroll()) {
        window.setTimeout(tryScroll, 0);
      }
      setPosition(startPosition);
    } catch (err) {
      console.error("Failed to load chapter preview", err);
    }
  };

  useEffect(() => {
    if (!story_id) return;

    const tick = async () => {
      try {
        if (document.hidden) return;
        await addReadingSession({ storyId: story_id, minutesDelta: 1 });
      } catch (err) {
        console.error("Failed to track reading session", err);
      }
    };

    if (readingTickTimer.current) {
      window.clearInterval(readingTickTimer.current);
    }

    readingTickTimer.current = window.setInterval(tick, 60_000);

    return () => {
      if (readingTickTimer.current) {
        window.clearInterval(readingTickTimer.current);
        readingTickTimer.current = null;
      }
    };
  }, [story_id]);

  const saveProgress = useCallback(
    async (nextPosition) => {
      if (!story_id || !chapter?.chapter_id) return;

      const container = document.getElementById("reader-scroll-container");
      const maxScroll = container ? Math.max(0, container.scrollHeight - container.clientHeight) : 0;
      const chapterPercent = maxScroll ? Math.min(100, Math.max(0, (nextPosition / maxScroll) * 100)) : 0;

      try {
        setSaving(true);
        await updateProgress({
          storyId: story_id,
          chapterId: chapter.chapter_id,
          position: nextPosition,
          chapterPercent,
        });
      } catch (err) {
        console.error("Failed to save progress", err);
      } finally {
        setSaving(false);
      }
    },
    [chapter?.chapter_id, story_id]
  );

  const handleScroll = useCallback(
    (e) => {
      const nextPos = e.currentTarget.scrollTop || 0;
      setPosition(nextPos);

      if (progressSaveTimer.current) {
        window.clearTimeout(progressSaveTimer.current);
      }

      progressSaveTimer.current = window.setTimeout(() => {
        saveProgress(nextPos);
      }, 600);
    },
    [saveProgress]
  );

  const loadChapterEngagement = useCallback(
    async (chapterId) => {
      if (!chapterId) return;
      try {
        const res = await getChapterEngagement(chapterId);
        const data = res.data || {};
        setLikeCount(Number(data.likeCount) || 0);
        setShareCount(Number(data.shareCount) || 0);
        setCommentCount(Number(data.commentCount) || 0);
        setChapterLiked(Boolean(data.likedByMe));
      } catch (err) {
        console.error("Failed to load chapter engagement", err);
      }
    },
    []
  );

  const loadChapterComments = useCallback(
    async (chapterId) => {
      if (!chapterId) return;
      try {
        setCommentsLoading(true);
        const res = await listChapterComments(chapterId, { limit: 50, skip: 0 });
        setComments(res.data?.comments || []);
      } catch (err) {
        console.error("Failed to load chapter comments", err);
        setComments([]);
      } finally {
        setCommentsLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (!chapter?.chapter_id) return;
    loadChapterEngagement(chapter.chapter_id);

    if (engagementOpen) {
      loadChapterComments(chapter.chapter_id);
    } else {
      setComments([]);
      setCommentText("");
      setCommentWarning("");
      setReplyingTo(null);
      setReplyText("");
      setReplyWarning("");
      setReportToast("");
    }
  }, [chapter?.chapter_id, engagementOpen, loadChapterComments, loadChapterEngagement]);

  useEffect(() => {
    if (!chapter?.chapter_id) {
      setPlotCredits(null);
      return;
    }
    getChapterCredits(chapter.chapter_id)
      .then((res) => setPlotCredits(res.data?.credits || null))
      .catch(() => setPlotCredits(null));
  }, [chapter?.chapter_id]);


  const getAuthorName = () => {
    if (!intro || !intro.author) return "Unknown";
    return intro.author.name || "Unknown";
  };

  const handleBack = () => {
    navigate(-1);
  };

  const disableCopyHandlers = {
    onCopy: (e) => e.preventDefault(),
    onCut: (e) => e.preventDefault(),
    onDragStart: (e) => e.preventDefault(),
    onKeyDown: (e) => {
      const key = (e.key || "").toLowerCase();
      const isCopy = (e.ctrlKey || e.metaKey) && (key === "c" || key === "x");
      if (isCopy) {
        e.preventDefault();
      }
    },
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey)) {
        const key = e.key.toLowerCase();
        if (["c", "x", "s", "p"].includes(key)) {
          e.preventDefault();
        }
      }
    };

    const handleDocumentCopy = (e) => {
      e.preventDefault();
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("copy", handleDocumentCopy);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("copy", handleDocumentCopy);
    };
  }, []);

  const handleSelectionChange = () => {
    const selection = window.getSelection();
    if (!selection) return;
    const text = selection.toString().trim();
    if (!text) {
      setSelectedWord("");
      return;
    }

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    setTooltipPos({ top: rect.bottom + window.scrollY, left: rect.left + window.scrollX });
    setSelectedWord(text);
  };

  const selectWordAtPoint = (clientX, clientY) => {
    try {
      let range = null;

      if (document.caretPositionFromPoint) {
        const pos = document.caretPositionFromPoint(clientX, clientY);
        if (pos) {
          range = document.createRange();
          range.setStart(pos.offsetNode, pos.offset);
          range.setEnd(pos.offsetNode, pos.offset);
        }
      } else if (document.caretRangeFromPoint) {
        range = document.caretRangeFromPoint(clientX, clientY);
      }

      if (!range) return false;

      const node = range.startContainer;
      if (!node || node.nodeType !== Node.TEXT_NODE) return false;

      const text = node.textContent || "";
      if (!text) return false;

      let start = range.startOffset;
      let end = range.startOffset;

      const isWordChar = (ch) => /[A-Za-z0-9'-]/.test(ch);

      while (start > 0 && isWordChar(text[start - 1])) start -= 1;
      while (end < text.length && isWordChar(text[end])) end += 1;

      if (start === end) return false;

      const wordRange = document.createRange();
      wordRange.setStart(node, start);
      wordRange.setEnd(node, end);

      const selection = window.getSelection();
      if (!selection) return false;
      selection.removeAllRanges();
      selection.addRange(wordRange);
      return true;
    } catch (_e) {
      return false;
    }
  };

  const handleWordClick = (e) => {
    const selection = window.getSelection();
    const selectedText = selection?.toString().trim();

    if (selectedText) {
      handleSelectionChange();
      return;
    }

    const ok = selectWordAtPoint(e.clientX, e.clientY);
    if (ok) {
      handleSelectionChange();
    } else {
      setSelectedWord("");
    }
  };

  const handleContextMenu = (e) => {
    e.preventDefault();

    const selection = window.getSelection();
    const selectedText = selection?.toString().trim();

    if (selectedText) {
      handleSelectionChange();
      return;
    }

    const ok = selectWordAtPoint(e.clientX, e.clientY);
    if (ok) {
      handleSelectionChange();
    } else {
      setSelectedWord("");
    }
  };

  const canDeleteComment = (commentUserId) => {
    if (!myUserId) return false;
    return myUserId === commentUserId || myUserId === storyAuthorId;
  };

  const handleToggleLike = async () => {
    if (!chapter?.chapter_id || likeBusy) return;
    try {
      setLikeBusy(true);
      if (chapterLiked) {
        const res = await unlikeChapter(chapter.chapter_id);
        setChapterLiked(false);
        setLikeCount(Number(res.data?.count) || 0);
      } else {
        const res = await likeChapter(chapter.chapter_id);
        setChapterLiked(true);
        setLikeCount(Number(res.data?.count) || 0);
      }
    } catch (err) {
      console.error("Failed to toggle like", err);
    } finally {
      setLikeBusy(false);
    }
  };

  const handleShare = async (platform = "copy_link") => {
    if (!chapter?.chapter_id) return;
    try {
      const url = `${window.location.origin}/read/${storyId}`;
      const res = await shareChapter(chapter.chapter_id, platform);
      setShareCount(Number(res.data?.count) || shareCount);

      if (platform === "copy_link") {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(url);
        }
      } else if (platform === "whatsapp") {
        const waUrl = `https://wa.me/?text=${encodeURIComponent(url)}`;
        window.open(waUrl, "_blank", "noopener,noreferrer");
      } else if (platform === "instagram") {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(url);
        }
      }
    } catch (err) {
      console.error("Failed to share chapter", err);
    } finally {
      setShareOpen(false);
    }
  };

  const handleOpenComments = async () => {
    setEngagementOpen(true);
    if (chapter?.chapter_id) {
      await loadChapterComments(chapter.chapter_id);
    }
  };

  const handleCreateComment = async () => {
    if (!chapter?.chapter_id || commentBusy) return;
    const body = (commentText || "").trim();
    if (!body) return;
    try {
      setCommentBusy(true);
      setCommentWarning("");
      await createChapterComment(chapter.chapter_id, body);
      setCommentText("");
      await loadChapterComments(chapter.chapter_id);
      await loadChapterEngagement(chapter.chapter_id);
    } catch (err) {
      console.error("Failed to create chapter comment", err);
      const status = err?.response?.status;
      const msg = err?.response?.data?.message || err?.message || "";
      const labels = Array.isArray(err?.response?.data?.labels) ? err.response.data.labels : [];
      if (status === 422) {
        const labelText = labels.length ? ` (${labels.join(", ")})` : "";
        setCommentWarning((msg || "This comment appears to be offensive and cannot be posted.") + labelText);
      }
    } finally {
      setCommentBusy(false);
    }
  };

  const handleSubmitReply = async (parentCommentId) => {
    if (!parentCommentId || replyBusy) return;
    const body = (replyText || "").trim();
    if (!body) return;
    try {
      setReplyBusy(true);
      setReplyWarning("");
      await replyToComment(parentCommentId, body);
      setReplyingTo(null);
      setReplyText("");
      if (chapter?.chapter_id) {
        await loadChapterComments(chapter.chapter_id);
        await loadChapterEngagement(chapter.chapter_id);
      }
    } catch (err) {
      console.error("Failed to reply", err);
      const status = err?.response?.status;
      const msg = err?.response?.data?.message || err?.message || "";
      const labels = Array.isArray(err?.response?.data?.labels) ? err.response.data.labels : [];
      if (status === 422) {
        const labelText = labels.length ? ` (${labels.join(", ")})` : "";
        setReplyWarning((msg || "This reply appears to be offensive and cannot be posted.") + labelText);
      }
    } finally {
      setReplyBusy(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!commentId) return;
    try {
      await deleteComment(commentId);
      if (chapter?.chapter_id) {
        await loadChapterComments(chapter.chapter_id);
        await loadChapterEngagement(chapter.chapter_id);
      }
    } catch (err) {
      console.error("Failed to delete comment", err);
    }
  };

  const hasReacted = (reactions = [], reaction) => {
    if (!myUserId) return false;
    return reactions.some((r) => r.user_id === myUserId && r.reaction === reaction);
  };

  const countReaction = (reactions = [], reaction) => {
    return reactions.filter((r) => r.reaction === reaction).length;
  };

  const handleToggleReaction = async (commentId, reaction) => {
    if (!commentId || !reaction) return;
    try {
      const current = comments.find((c) => c.comment_id === commentId);
      const reacted = hasReacted(current?.reactions || [], reaction);
      if (reacted) {
        await removeCommentReaction(commentId, reaction);
      } else {
        await reactToComment(commentId, reaction);
      }
      if (chapter?.chapter_id) {
        await loadChapterComments(chapter.chapter_id);
      }
    } catch (err) {
      console.error("Failed to toggle reaction", err);
    }
  };

  const handleReportComment = async (commentId) => {
    if (!commentId) return;
    try {
      const reason = window.prompt("Why are you reporting this comment? (optional)") || null;
      const res = await reportComment(commentId, reason);
      const hidden = Boolean(res.data?.hidden);
      const count = Number(res.data?.count) || 0;
      setReportToast(hidden ? `Reported. Comment hidden (reports: ${count}).` : `Reported (reports: ${count}).`);
      window.setTimeout(() => setReportToast(""), 2500);
    } catch (err) {
      console.error("Failed to report comment", err);
      setReportToast("Failed to report.");
      window.setTimeout(() => setReportToast(""), 2500);
    }
  };

  const handleAddBookmark = async () => {
    if (!chapter) return;
    try {
      await addBookmark({
        storyId: story_id,
        chapterId: chapter.chapter_id,
        position,
      });
      const bmRes = await getBookmarks(story_id);
      setBookmarks(bmRes.data || []);
      setBookmarkToast("Saved to bookmarks");
      window.setTimeout(() => setBookmarkToast(""), 2000);
    } catch (err) {
      console.error("Failed to add bookmark", err);
    }
  };

  const handleBookmarkJump = async (bm) => {
    if (!bm?.chapter_id) return;
    await handleChapterClick(bm.chapter_id, { startPosition: bm.position ?? 0, storyMeta: intro });
  };

  const handleDeleteBookmark = async (bookmarkId) => {
    try {
      await deleteBookmark(bookmarkId);
      const bmRes = await getBookmarks(story_id);
      setBookmarks(bmRes.data || []);
    } catch (err) {
      console.error("Failed to delete bookmark", err);
    }
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loadingContainer}>
          <div className={styles.spinner}></div>
        </div>
      </div>
    );
  }

  if (error || !intro || !chapter) {
    return (
      <div className={styles.page}>
        <button className={styles.backBtn} onClick={handleBack}>
          ← Back
        </button>
        <p className={styles.errorText}>{error || "Unable to open this book."}</p>
      </div>
    );
  }

  const themeClass =
    theme === "light"
      ? styles.themeLight
      : theme === "sepia"
        ? styles.themeSepia
        : theme === "parchment"
          ? styles.themeParchment
          : theme === "rose"
            ? styles.themeRose
            : theme === "forest"
              ? styles.themeForest
              : theme === "highContrast"
                ? styles.themeHighContrast
                : styles.themeDark;

  return (
    <div className={`${styles.page} ${themeClass}`}>
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={handleBack}>
          ← Library
        </button>
        <div className={styles.headerInfo}>
          <h1 className={styles.title}>{intro.title}</h1>
          <span className={styles.author}>by {getAuthorName()}</span>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.headerBtn} onClick={handleAddBookmark}>
            🔖 Bookmark
          </button>
          {saving && <span className={styles.saving}>Saving…</span>}
          {bookmarkToast && <span className={styles.bookmarkToast}>{bookmarkToast}</span>}
        </div>
        <div className={styles.readerControls}>
          <span className={styles.controlLabel}>Text</span>
          <button
            className={styles.controlBtn}
            onClick={() =>
              setFontSize((prev) => (prev === "small" ? "small" : prev === "medium" ? "small" : "medium"))
            }
          >
            A-
          </button>
          <button
            className={styles.controlBtn}
            onClick={() =>
              setFontSize((prev) => (prev === "large" ? "large" : prev === "medium" ? "large" : "medium"))
            }
          >
            A+
          </button>
          <button
            className={styles.controlBtn}
            onClick={() => setBoldText((v) => !v)}
          >
            B
          </button>
          <select
            className={styles.controlSelect}
            value={fontFamily}
            onChange={(e) => setFontFamily(e.target.value)}
          >
            <option value="serif">Serif</option>
            <option value="sans">Sans</option>
            <option value="mono">Mono</option>
          </select>
          <span className={styles.controlLabel}>Spacing</span>
          <select
            className={styles.controlSelect}
            value={lineSpacing}
            onChange={(e) => setLineSpacing(e.target.value)}
          >
            <option value="tight">Tight</option>
            <option value="normal">Normal</option>
            <option value="loose">Loose</option>
          </select>
          <span className={styles.controlLabel}>Theme</span>
          <select
            className={styles.controlSelect}
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
          >
            <option value="light">Light</option>
            <option value="sepia">Sepia</option>
            <option value="parchment">Parchment</option>
            <option value="rose">Rose</option>
            <option value="forest">Forest</option>
            <option value="dark">Midnight</option>
            <option value="highContrast">High Contrast</option>
          </select>
        </div>
      </header>

      <div className={styles.layout}>
        <aside className={styles.sidebar}>
          <div className={styles.sidebarTitle}>Chapters</div>
          <ul className={styles.chapterList}>
            {(intro.chapters || []).map((c) => (
              <li
                key={c.chapter_id}
                className={`${styles.chapterItem} ${c.chapter_id === chapter.chapter_id ? styles.activeChapter : ""}`}
              >
                <button
                  type="button"
                  className={styles.bookmarkJump}
                  onClick={() => handleChapterClick(c.chapter_id, { startPosition: 0 })}
                >
                  <span className={styles.chapterIndex}>{(c.order_index ?? 0) + 1}</span>
                  <span className={styles.chapterLabel}>{c.title || `Chapter ${(c.order_index ?? 0) + 1}`}</span>
                </button>
              </li>
            ))}
          </ul>

          <div className={styles.bookmarksBox}>
            <div className={styles.sidebarTitle}>Bookmarks</div>
            <ul className={styles.bookmarkList}>
              {bookmarks.map((bm) => (
                <li key={bm.id} className={styles.bookmarkItem}>
                  <button
                    type="button"
                    className={styles.bookmarkJump}
                    onClick={() => handleBookmarkJump(bm)}
                  >
                    <span>{bm.chapter?.title || `Chapter ${bm.chapter_id}`}</span>
                    <span>{bm.position ?? 0}</span>
                  </button>
                  <button
                    type="button"
                    className={styles.bookmarkDelete}
                    onClick={() => handleDeleteBookmark(bm.id)}
                    aria-label="Delete bookmark"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        <main className={`${styles.readerShell} ${themeClass}`}>
          <div className={styles.igBar}>
            <button
              type="button"
              className={`${styles.igBtn} ${chapterLiked ? styles.igBtnActive : ""}`}
              onClick={handleToggleLike}
              disabled={likeBusy}
            >
              <div className={styles.igIcon}>{chapterLiked ? "♥" : "♡"}</div>
              <div className={styles.igCount}>{likeCount}</div>
            </button>

            <button
              type="button"
              className={`${styles.igBtn} ${engagementOpen ? styles.igBtnActive : ""}`}
              onClick={handleOpenComments}
            >
              <div className={styles.igIcon}>💬</div>
              <div className={styles.igCount}>{commentCount}</div>
            </button>

            <button
              type="button"
              className={`${styles.igBtn} ${shareOpen ? styles.igBtnActive : ""}`}
              onClick={() => setShareOpen(true)}
            >
              <div className={styles.igIcon}>⤴</div>
              <div className={styles.igCount}>{shareCount}</div>
            </button>
          </div>

          <div
            id="reader-scroll-container"
            className={styles.readerBody}
            onScroll={handleScroll}
            onClick={handleWordClick}
            onMouseUp={handleSelectionChange}
            onContextMenu={handleContextMenu}
            {...disableCopyHandlers}
          >
            <div className={styles.chapterContent}>
              <div className={styles.chapterTitle}>{chapter.title}</div>
              <div
                className={`${styles.chapterText} ${
                  fontSize === "small" ? styles.textSmall : fontSize === "large" ? styles.textLarge : styles.textMedium
                } ${
                  fontFamily === "sans" ? styles.textSans : fontFamily === "mono" ? styles.textMono : styles.textSerif
                } ${boldText ? styles.textBold : ""}`}
                style={{
                  lineHeight: lineSpacing === "tight" ? 1.5 : lineSpacing === "loose" ? 1.9 : 1.7,
                }}
                dangerouslySetInnerHTML={{ __html: chapter.content_html || "" }}
              />
              {plotCredits?.contributors?.length > 0 && (
                <div className={plotStyles.credits}>
                  {plotCredits.twistTitle && <h4>{plotCredits.twistTitle}</h4>}
                  {plotCredits.twistText && (
                    <div style={{ marginTop: "0.5rem", fontStyle: "italic" }}>
                      {plotCredits.twistText}
                    </div>
                  )}
                  <p style={{ marginTop: "0.75rem" }}>
                    Inspired by Aurora Card submissions from:{" "}
                    {plotCredits.contributors.map((c) => `@${c.handle}`).join(", ")}
                  </p>
                  {plotCredits.creditNote && <p style={{ fontSize: "0.9rem" }}>{plotCredits.creditNote}</p>}
                </div>
              )}

              {chapter?.chapter_id && (
                <PlotTwistSubmissionPanel chapterId={chapter.chapter_id} />
              )}
            </div>
          </div>
        </main>
      </div>

      {engagementOpen && (
        <div className={styles.cmtOverlay} onClick={() => setEngagementOpen(false)}>
          <div className={styles.cmtModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.cmtHeader}>
              <div className={styles.cmtTitle}>Comments</div>
              <button type="button" className={styles.cmtClose} onClick={() => setEngagementOpen(false)}>
                ✕
              </button>
            </div>

            {reportToast && (
              <div style={{ padding: "8px 16px", color: "rgb(2, 30, 71)", fontWeight: 800 }}>
                {reportToast}
              </div>
            )}

            <div className={styles.cmtBody}>
              {commentsLoading ? (
                <div className={styles.commentsEmpty}>Loading…</div>
              ) : comments.length === 0 ? (
                <div className={styles.commentsEmpty}>No comments yet.</div>
              ) : (
                <div className={styles.commentsList}>
                  {comments.map((c) => {
                    const author =
                      c.user?.profile?.handle_name ||
                      [c.user?.first_name, c.user?.last_name].filter(Boolean).join(" ") ||
                      "Unknown";
                    const created = c.created_at ? new Date(c.created_at).toLocaleString() : "";
                    return (
                      <div key={c.comment_id} className={styles.commentItem}>
                        <div className={styles.commentHeader}>
                          <div className={styles.commentAuthor}>{author}</div>
                          <div className={styles.commentTime}>{created}</div>
                        </div>
                        <div className={styles.commentBody}>{c.body}</div>

                        <div className={styles.cmtActions}>
                          <div className={styles.cmtReactions}>
                            <button
                              type="button"
                              className={`${styles.reactBtn} ${
                                hasReacted(c.reactions || [], "like") ? styles.reactBtnActive : ""
                              }`}
                              onClick={() => handleToggleReaction(c.comment_id, "like")}
                            >
                              <span className={styles.reactEmoji}>👍</span>
                              <span className={styles.reactCount}>{countReaction(c.reactions || [], "like")}</span>
                            </button>
                            <button
                              type="button"
                              className={`${styles.reactBtn} ${
                                hasReacted(c.reactions || [], "love") ? styles.reactBtnActive : ""
                              }`}
                              onClick={() => handleToggleReaction(c.comment_id, "love")}
                            >
                              <span className={styles.reactEmoji}>❤️</span>
                              <span className={styles.reactCount}>{countReaction(c.reactions || [], "love")}</span>
                            </button>
                          </div>

                          <div>
                            <button
                              type="button"
                              className={styles.replyBtn}
                              onClick={() => {
                                setReplyingTo(c.comment_id);
                                setReplyText("");
                                setReplyWarning("");
                              }}
                            >
                              Reply
                            </button>
                            <button
                              type="button"
                              className={styles.replyBtn}
                              onClick={() => handleReportComment(c.comment_id)}
                            >
                              Report
                            </button>
                            {canDeleteComment(c.user_id) && (
                              <button
                                type="button"
                                className={styles.replyBtn}
                                onClick={() => handleDeleteComment(c.comment_id)}
                              >
                                Delete
                              </button>
                            )}
                          </div>
                        </div>

                        {replyingTo === c.comment_id && (
                          <div className={styles.replyComposer}>
                            <div style={{ position: "relative" }}>
                              <div
                                style={{
                                  position: "absolute",
                                  top: 10,
                                  left: 12,
                                  right: 12,
                                  fontSize: 12,
                                  fontWeight: 800,
                                  color: "rgba(2, 30, 71, 0.55)",
                                  filter: "blur(0.4px)",
                                  opacity: 0.7,
                                  pointerEvents: "none",
                                  userSelect: "none",
                                }}
                              >
                                Keep it kind. No hate speech or bad vibes.
                              </div>
                              <textarea
                                className={styles.replyInput}
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                rows={3}
                                placeholder="Write a reply…"
                                style={{ paddingTop: 28 }}
                              />
                            </div>

                            {replyWarning && (
                              <div style={{ marginTop: 8, color: "#b91c1c", fontWeight: 700 }}>
                                {replyWarning}
                              </div>
                            )}

                            <div className={styles.replyActions}>
                              <button
                                type="button"
                                className={styles.replyCancel}
                                onClick={() => {
                                  setReplyingTo(null);
                                  setReplyText("");
                                  setReplyWarning("");
                                }}
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                className={styles.replySubmit}
                                onClick={() => handleSubmitReply(c.comment_id)}
                                disabled={replyBusy}
                              >
                                {replyBusy ? "Posting…" : "Reply"}
                              </button>
                            </div>
                          </div>
                        )}

                        {Array.isArray(c.replies) && c.replies.length > 0 && (
                          <div className={styles.replyList}>
                            {c.replies.map((r) => {
                              const rAuthor =
                                r.user?.profile?.handle_name ||
                                [r.user?.first_name, r.user?.last_name].filter(Boolean).join(" ") ||
                                "Unknown";
                              const rTime = r.created_at ? new Date(r.created_at).toLocaleString() : "";
                              return (
                                <div key={r.comment_id} className={styles.replyItem}>
                                  <div className={styles.replyMeta}>
                                    <div className={styles.replyAuthor}>{rAuthor}</div>
                                    <div className={styles.replyTime}>{rTime}</div>
                                  </div>
                                  <div className={styles.replyBody}>{r.body}</div>
                                  <button
                                    type="button"
                                    className={styles.replyBtn}
                                    onClick={() => handleReportComment(r.comment_id)}
                                  >
                                    Report
                                  </button>
                                  {canDeleteComment(r.user_id) && (
                                    <button
                                      type="button"
                                      className={styles.replyBtn}
                                      onClick={() => handleDeleteComment(r.comment_id)}
                                    >
                                      Delete
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className={styles.cmtComposer}>
              <div style={{ position: "relative" }}>
                <div
                  style={{
                    position: "absolute",
                    top: 10,
                    left: 12,
                    right: 12,
                    fontSize: 12,
                    fontWeight: 800,
                    color: "rgba(2, 30, 71, 0.55)",
                    filter: "blur(0.4px)",
                    opacity: 0.7,
                    pointerEvents: "none",
                    userSelect: "none",
                  }}
                >
                  Keep it kind. No hate speech or bad vibes.
                </div>
                <textarea
                  className={styles.commentInput}
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  rows={3}
                  placeholder="Write a comment…"
                  style={{ paddingTop: 28 }}
                />
              </div>

              <div>
                {commentWarning && (
                  <div style={{ marginBottom: 8, color: "#b91c1c", fontWeight: 700 }}>
                    {commentWarning}
                  </div>
                )}
                <button
                  type="button"
                  className={styles.commentSubmit}
                  onClick={handleCreateComment}
                  disabled={commentBusy}
                >
                  {commentBusy ? "Posting…" : "Post"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {shareOpen && (
        <div className={styles.shareOverlay} onClick={() => setShareOpen(false)}>
          <div className={styles.shareModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.shareHeader}>
              <div className={styles.shareTitle}>Share</div>
              <button type="button" className={styles.shareClose} onClick={() => setShareOpen(false)}>
                ✕
              </button>
            </div>
            <div className={styles.shareGrid}>
              <button type="button" className={styles.shareOptionWide} onClick={() => handleShare("copy_link")}>
                Copy link
              </button>
              <button type="button" className={styles.shareOption} onClick={() => handleShare("twitter")}>
                Twitter/X
              </button>
              <button type="button" className={styles.shareOption} onClick={() => handleShare("facebook")}>
                Facebook
              </button>
              <button type="button" className={styles.shareOption} onClick={() => handleShare("whatsapp")}>
                WhatsApp
              </button>
              <button type="button" className={styles.shareOption} onClick={() => handleShare("instagram")}>
                Instagram
              </button>
            </div>
          </div>
        </div>
      )}

      <DictionaryTooltip
        word={selectedWord}
        position={tooltipPos}
        onClose={() => setSelectedWord("")}
      />
    </div>
  );
}

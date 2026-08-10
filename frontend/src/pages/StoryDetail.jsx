import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import styles from "../styles/storyDetail.module.css";
import * as recApi from "../services/recommendationApi";
import { addToTBR } from "../services/libraryApi";
import { followWriter, getMyFollowingWriters, getWriterFollowers, unfollowWriter } from "../services/followService";
import {
  listStoryReviews,
  shareStory,
  upsertStoryReview,
} from "../services/engagementService";
import { getMyProfile } from "../services/profileService";
import { publicStoryBadges } from "../services/insightsService";
import DictionaryTooltip from "../components/DictionaryTooltip";

export default function StoryDetail() {
  const { storyId } = useParams();
  const navigate = useNavigate();

  const [story, setStory] = useState(null);
  const [similarStories, setSimilarStories] = useState([]);
  const [aiRecsLoading, setAiRecsLoading] = useState(false);
  const [aiRecEngine, setAiRecEngine] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [addingTBR, setAddingTBR] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);
  const [followersOpen, setFollowersOpen] = useState(false);
  const [followers, setFollowers] = useState([]);
  const [followersCount, setFollowersCount] = useState(0);

  const [myUserId, setMyUserId] = useState(null);
  const [_myRole, setMyRole] = useState(null);

  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [avgRating, setAvgRating] = useState(null);
  const [reviewCount, setReviewCount] = useState(0);
  const [myReviewText, setMyReviewText] = useState("");
  const [reviewBusy, setReviewBusy] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [selectedWord, _setSelectedWord] = useState('');

  const [publicBadges, setPublicBadges] = useState([]);

  useEffect(() => {
    if (!storyId) return;
    if (!history.state?.usr?.highlightReviewId) return;
    const reviewId = history.state.usr.highlightReviewId;
    window.history.replaceState({ ...history.state, usr: { ...history.state?.usr, highlightReviewId: null } }, "");
    setTimeout(() => {
      const el = document.querySelector(`[data-review-id="${reviewId}"]`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.classList.add(styles.reviewHighlight);
        setTimeout(() => el.classList.remove(styles.reviewHighlight), 2200);
      }
    }, 600);
  }, [storyId]);

  useEffect(() => {
    let cancelled = false;
    const loadMe = async () => {
      try {
        const res = await getMyProfile();
        const id = res.data?.user_id;
        if (!cancelled) {
          setMyUserId(typeof id === "number" ? id : null);
          setMyRole(res.data?.role || null);
        }
      } catch {
        if (!cancelled) {
          setMyUserId(null);
          setMyRole(null);
        }
      }
    };
    loadMe();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const loadFollowState = async () => {
      try {
        if (!story?.author?.user_id) return;
        const [followingRes, followersRes] = await Promise.all([
          getMyFollowingWriters(),
          getWriterFollowers(story.author.user_id),
        ]);

        const following = followingRes.data?.following || [];
        setIsFollowing(following.some((f) => f.writer_id === story.author.user_id));

        setFollowers(followersRes.data?.followers || []);
        setFollowersCount(followersRes.data?.total || followersRes.data?.followers?.length || 0);
      } catch (e) {
        console.error("Failed to load follow state", e);
      }
    };

    loadFollowState();
  }, [story?.author?.user_id]);

  const fetchStoryDetails = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await recApi.getStoryDetails(storyId);
      setStory(res.data);

      try {
        const badgesRes = await publicStoryBadges(Number(storyId));
        setPublicBadges(badgesRes.data?.badges || []);
      } catch (_e) {
        setPublicBadges([]);
      }

      if (res.data) {
        setAiRecsLoading(true);
        setSimilarStories([]);
        setAiRecEngine(null);
        try {
          const aiRes = await recApi.getGeminiRecommendations({
            storyId: Number(storyId),
            limit: 5,
          });
          setSimilarStories(aiRes.data?.recommendations || []);
          setAiRecEngine(aiRes.data?.engine || null);
        } catch (err) {
          console.error("Failed to fetch AI recommendations:", err);
          try {
            const similarRes = await recApi.getBecauseYouLoved(storyId);
            setSimilarStories(
              (similarRes.data?.stories?.slice(0, 5) || []).map((s) => ({
                ...s,
                ai_reason: null,
              }))
            );
          } catch (fallbackErr) {
            console.error("Failed to fetch similar stories:", fallbackErr);
          }
        } finally {
          setAiRecsLoading(false);
        }
      }
    } catch (err) {
      console.error("Failed to fetch story:", err);
      setError("Story not found");
    } finally {
      setLoading(false);
    }
  }, [storyId]);

  useEffect(() => {
    if (!storyId) return;
    fetchStoryDetails();
  }, [storyId, fetchStoryDetails]);

  const handleAddToBeRead = async () => {
    setAddingTBR(true);
    try {
      await addToTBR(Number(storyId));
      showToast("Added to your To-Be-Read list! 📚");
      setMenuOpen(false);
    } catch (err) {
      console.error("Failed to add to TBR:", err);
      showToast("Failed to add. Try again.");
    } finally {
      setAddingTBR(false);
    }
  };

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };

  const handleShareStory = async (platform = "copy_link") => {
    try {
      await shareStory(Number(storyId), platform);
    } catch (e) {
      console.error("Share tracking failed", e);
    }

    const url = window.location.href;
    const encoded = encodeURIComponent(url);
    const shareUrls = {
      whatsapp: `https://wa.me/?text=${encoded}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encoded}`,
      instagram: `https://www.instagram.com/`,
      tiktok: `https://www.tiktok.com/`,
    };

    if (platform === "copy_link") {
      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(url);
          showToast("Link copied!");
        }
      } catch (err) {
        console.error("Copy link failed", err);
      }
      return;
    }

    const target = shareUrls[platform];
    if (target) window.open(target, "_blank", "noopener,noreferrer");
  };

  const getAuthorDisplay = (author) => {
    if (!author) return { name: "Unknown Author", handle: "" };
    // Prefer profile names over user table names (profile is where users update their display name)
    const firstName = author.profile?.first_name || author.first_name;
    const lastName = author.profile?.last_name || author.last_name;
    const name = [firstName, lastName].filter(Boolean).join(" ") || "Unknown Author";
    const handle = author.profile?.handle_name || "";
    return { name, handle };
  };

  const getAuthorInitial = (author) => {
    if (!author) return "?";
    const firstName = author.profile?.first_name || author.first_name;
    const lastName = author.profile?.last_name || author.last_name;
    return (firstName?.[0] || lastName?.[0] || "?").toUpperCase();
  };

  const formatWordCount = (count) => {
    if (!count) return "0";
    if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
    return count.toString();
  };

  const handleTagClick = (tag) => {
    navigate(`/discover?tag=${encodeURIComponent(tag)}`);
  };

  const handleCategoryClick = (category) => {
    navigate(`/discover?category=${encodeURIComponent(category)}`);
  };

  const handleSimilarBookClick = (id) => {
    navigate(`/story/${id}`);
  };

  const handleStartReading = () => {
    // Check if user is authenticated
    const token = localStorage.getItem("token");
    if (!token) {
      // Store the intended destination and redirect to login
      navigate("/login", { state: { redirectTo: `/read/${storyId}` } });
      return;
    }
    // User is authenticated, navigate to reading page
    navigate(`/read/${storyId}`);
  };

  const refreshStoryReviews = useCallback(async () => {
    setReviewsLoading(true);
    try {
      const res = await listStoryReviews(Number(storyId));
      setReviews(res.data?.reviews || []);
      setAvgRating(res.data?.avg_rating ?? null);
      setReviewCount(res.data?.total ?? (res.data?.reviews?.length || 0));
    } catch (e) {
      console.error("Failed to load story reviews", e);
      setReviews([]);
      setAvgRating(null);
      setReviewCount(0);
    } finally {
      setReviewsLoading(false);
    }
  }, [storyId]);

  useEffect(() => {
    if (!story) return;
    refreshStoryReviews();
  }, [story, refreshStoryReviews]);

  const handleSubmitReview = async () => {
    const trimmedReview = myReviewText.trim();
    if (!trimmedReview) {
      showToast("Write a review so AI can infer your rating.");
      return;
    }

    setReviewBusy(true);
    try {
      await upsertStoryReview(Number(storyId), null, trimmedReview);
      setMyReviewText("");
      await refreshStoryReviews();
      showToast("Review saved");
    } catch (e) {
      console.error("Failed to save review", e);
      showToast("Failed to save review");
    } finally {
      setReviewBusy(false);
    }
  };

  const handleToggleFollow = async () => {
    const writerId = story?.author?.user_id;
    if (!writerId) return;

    setFollowBusy(true);
    try {
      if (isFollowing) {
        await unfollowWriter(writerId);
        setIsFollowing(false);
        setFollowersCount((c) => Math.max(0, c - 1));
        showToast("Unfollowed");
      } else {
        await followWriter(writerId);
        setIsFollowing(true);
        setFollowersCount((c) => c + 1);
        showToast("Following");
      }
    } catch (e) {
      console.error("Toggle follow failed", e);
      showToast("Action failed. Try again.");
    } finally {
      setFollowBusy(false);
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

  if (error || !story) {
    return (
      <div className={styles.page}>
        <div className={styles.errorContainer}>
          <div className={styles.errorIcon}>📚</div>
          <p className={styles.errorText}>{error || "Story not found"}</p>
          <button className={styles.backBtn} onClick={() => navigate(-1)}>
            ← Go Back
          </button>
        </div>
      </div>
    );
  }

  const author = getAuthorDisplay(story.author);
  const tags = story.tags ? story.tags.split(",").map((t) => t.trim()) : [];
  const showFollow = Boolean(story.author?.user_id) && myUserId && myUserId !== story.author.user_id;

  return (
    <div className={styles.page}>
      {/* Back Button */}
      <button className={styles.backBtn} onClick={() => navigate(-1)}>
        ← Back to Discover
      </button>

      {/* Hero Section */}
      <section className={styles.heroSection}>
        <div className={styles.heroContent}>
          {/* Cover */}
          <div className={styles.coverContainer}>
            {story.cover_url ? (
              <img
                src={story.cover_url}
                alt={story.title}
                className={styles.coverImage}
              />
            ) : (
              <div className={styles.coverPlaceholder}>📖</div>
            )}

          </div>

          {/* Story Info */}
          <div className={styles.storyInfo}>
            <h1 className={styles.storyTitle}>{story.title || "Untitled Story"}</h1>

            {/* Author */}
            <div className={styles.authorRow}>
              {story.author?.profile?.profile_image ? (
                <img
                  src={story.author.profile.profile_image}
                  alt={author.name}
                  className={styles.authorAvatar}
                />
              ) : (
                <div className={styles.authorAvatarPlaceholder}>
                  {getAuthorInitial(story.author)}
                </div>
              )}
              <div>
                <button
                  type="button"
                  className={styles.authorLink}
                  onClick={() => story.author?.user_id && navigate(`/writer/${story.author.user_id}`)}
                >
                  {author.name}
                </button>
                {author.handle && (
                  <div className={styles.authorHandle}>{author.handle}</div>
                )}
              </div>

              {showFollow && (
                <div className={styles.followBox}>
                  <button
                    className={`${styles.followBtn} ${isFollowing ? styles.following : ""}`}
                    onClick={handleToggleFollow}
                    disabled={followBusy}
                  >
                    {followBusy ? "…" : isFollowing ? "Following" : "Follow"}
                  </button>
                  <button
                    className={styles.followersBtn}
                    onClick={() => setFollowersOpen(true)}
                    type="button"
                  >
                    {followersCount} followers
                  </button>
                </div>
              )}
            </div>

            {/* Meta */}
            <div className={styles.storyMeta}>
              <span className={styles.metaItem}>
                📖 {story.total_chapters || 0} Chapters
              </span>
              <span className={styles.metaItem}>
                📝 {formatWordCount(story.total_words)} words
              </span>
              <span className={styles.metaItem}>
                ⏱️ {story.estimated_minutes || 0} min read
              </span>
            </div>

            {/* Badges */}
            <div className={styles.storyBadges}>
              {story.category && (
                <span
                  className={`${styles.badge} ${styles.badgeCategory}`}
                  onClick={() => handleCategoryClick(story.category)}
                  style={{ cursor: "pointer" }}
                >
                  {story.category}
                </span>
              )}
              {tags.map((tag) => (
                <span
                  key={tag}
                  className={`${styles.badge} ${styles.badgeTag}`}
                  onClick={() => handleTagClick(tag)}
                >
                  {tag}
                </span>
              ))}
            </div>

            {/* Actions */}
            <div className={styles.actionRow}>
              <button className={styles.primaryBtn} onClick={handleStartReading}>
                📖 Start Reading
              </button>

              {publicBadges.length > 0 && (
                <div className={styles.socialProofBadges}>
                  {publicBadges.slice(0, 3).map((b) => (
                    <div key={b.key} className={styles.socialProofBadgeWrap}>
                      <div className={styles.socialProofBadgeIcon} role="img" aria-label={b.label}>
                        {b.icon}
                      </div>
                      <div className={styles.socialProofBadgeTooltip}>
                        <div className={styles.socialProofBadgeTooltipTitle}>{b.label}</div>
                        <div className={styles.socialProofBadgeTooltipBody}>{b.tooltip}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Three Dots Menu */}
              <div className={styles.menuContainer}>
                <button
                  className={styles.menuBtn}
                  onClick={() => setMenuOpen(!menuOpen)}
                >
                  ⋮
                </button>
                {menuOpen && (
                  <div className={styles.menuDropdown}>
                    <button
                      className={styles.menuItem}
                      onClick={handleAddToBeRead}
                      disabled={addingTBR}
                    >
                      <span className={styles.menuItemIcon}>📚</span>
                      {addingTBR ? "Adding..." : "Add to To-Be-Read"}
                    </button>
                    <button className={styles.menuItem} type="button" onClick={() => setShareOpen(true)}>
                      <span className={styles.menuItemIcon}>🔗</span>
                      Share Story
                    </button>
                    <button className={styles.menuItem}>
                      <span className={styles.menuItemIcon}>🚩</span>
                      Report
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {shareOpen && (
        <div className={styles.shareOverlay} onClick={() => setShareOpen(false)}>
          <div className={styles.shareModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.shareHeader}>
              <div className={styles.shareTitle}>Share</div>
              <button className={styles.shareClose} type="button" onClick={() => setShareOpen(false)}>
                ✕
              </button>
            </div>
            <div className={styles.shareGrid}>
              <button className={styles.shareOption} type="button" onClick={() => handleShareStory("whatsapp")}>WhatsApp</button>
              <button className={styles.shareOption} type="button" onClick={() => handleShareStory("facebook")}>Facebook</button>
              <button className={styles.shareOption} type="button" onClick={() => handleShareStory("instagram")}>Instagram</button>
              <button className={styles.shareOption} type="button" onClick={() => handleShareStory("tiktok")}>TikTok</button>
              <button className={styles.shareOptionWide} type="button" onClick={() => handleShareStory("copy_link")}>Copy link</button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className={styles.mainContent}>
        {/* Left Column */}
        <div>
          {/* Description */}
          <section className={styles.descriptionSection}>
            <h2 className={styles.sectionTitle}>📝 Description</h2>
            <p className={styles.descriptionText}>
              {story.description || "No description available."}
              <DictionaryTooltip
                word={selectedWord}
              />
            </p>
          </section>

          {/* Chapters */}
          {story.chapters && story.chapters.length > 0 && (
            <section className={styles.chaptersSection}>
              <h2 className={styles.sectionTitle}>
                📚 Chapters ({story.chapters.length})
              </h2>
              <div className={styles.chaptersList}>
                {story.chapters.map((chapter, index) => (
                  <div key={chapter.chapter_id} className={styles.chapterItem}>
                    <div className={styles.chapterLeft}>
                      <span className={styles.chapterNumber}>{index + 1}</span>
                      <div>
                        <div className={styles.chapterTitle}>
                          {chapter.title || `Chapter ${index + 1}`}
                        </div>
                        <div className={styles.chapterMeta}>
                          {formatWordCount(chapter.word_count)} words
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className={styles.reviewsSection}>
            <h2 className={styles.sectionTitle}>⭐ Reviews</h2>

            <div className={styles.reviewSummary}>
              <div className={styles.reviewAvg}>
                <span className={styles.reviewAvgValue}>{avgRating ? avgRating.toFixed(1) : "—"}</span>
                <span className={styles.reviewAvgOut}>/ 5</span>
              </div>
              <div className={styles.reviewCount}>{reviewCount} reviews</div>
            </div>

            <div className={styles.reviewComposer}>
              <textarea
                className={styles.reviewInput}
                value={myReviewText}
                onChange={(e) => setMyReviewText(e.target.value)}
                placeholder="Write your review so AI can infer your rating…"
                rows={3}
              />
              <p className={styles.reviewTime}>Your rating is inferred from your review text by AI.</p>
              <button className={styles.reviewSubmit} type="button" onClick={handleSubmitReview} disabled={reviewBusy || !myReviewText.trim()}>
                {reviewBusy ? "Saving…" : "Submit Review"}
              </button>
            </div>

            <div className={styles.reviewList}>
              {reviewsLoading ? (
                <div className={styles.reviewEmpty}>Loading reviews…</div>
              ) : reviews.length === 0 ? (
                <div className={styles.reviewEmpty}>No reviews yet. Be the first to review.</div>
              ) : (
                reviews.map((r) => (
                  <div key={r.id} data-review-id={r.id} className={styles.reviewItem}>
                    <div className={styles.reviewHeaderRow}>
                      <div className={styles.reviewAuthor}>
                        {r.user?.profile?.handle_name
                          ? `@${r.user.profile.handle_name}`
                          : [r.user?.first_name, r.user?.last_name].filter(Boolean).join(" ") || "Reader"}
                      </div>
                      <div className={styles.reviewRating}>{"★".repeat(r.rating || 0)}{r.rating ? "" : "—"}</div>
                    </div>
                    {r.review_text && <div className={styles.reviewBody}>{r.review_text}</div>}
                    <div className={styles.reviewTime}>{r.updated_at ? new Date(r.updated_at).toLocaleString() : ""}</div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        {/* Sidebar */}
        <aside className={styles.sidebar}>
          {/* Stats Card */}
          <div className={styles.sidebarCard}>
            <h3 className={styles.sectionTitle}>📊 Stats</h3>
            <div className={styles.statsGrid}>
              <div className={styles.statItem}>
                <div className={styles.statValue}>{story.total_chapters || 0}</div>
                <div className={styles.statLabel}>Chapters</div>
              </div>
              <div className={styles.statItem}>
                <div className={styles.statValue}>
                  {formatWordCount(story.total_words)}
                </div>
                <div className={styles.statLabel}>Words</div>
              </div>
              <div className={styles.statItem}>
                <div className={styles.statValue}>{story.estimated_minutes || 0}</div>
                <div className={styles.statLabel}>Min Read</div>
              </div>
              <div className={styles.statItem}>
                <div className={styles.statValue}>{tags.length}</div>
                <div className={styles.statLabel}>Tags</div>
              </div>
            </div>
          </div>

          {/* AI-powered similar books */}
          {(aiRecsLoading || similarStories.length > 0) && (
            <div className={styles.sidebarCard}>
              <h3 className={styles.sectionTitle}>
                ✨ AI Picks For You
                {aiRecEngine === "gemini" && (
                  <span className={styles.aiRecBadge}>Gemini</span>
                )}
              </h3>
              {aiRecsLoading ? (
                <p className={styles.aiRecLoading}>
                  Analyzing themes and tone…
                </p>
              ) : (
                <div className={styles.similarBooks}>
                  {similarStories.map((similar) => (
                    <div
                      key={similar.story_id}
                      className={styles.similarBookItem}
                      onClick={() => handleSimilarBookClick(similar.story_id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          handleSimilarBookClick(similar.story_id);
                        }
                      }}
                    >
                      {similar.cover_url ? (
                        <img
                          src={similar.cover_url}
                          alt={similar.title}
                          className={styles.similarBookCover}
                        />
                      ) : (
                        <div
                          className={styles.similarBookCover}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "1.5rem",
                          }}
                        >
                          📖
                        </div>
                      )}
                      <div className={styles.similarBookInfo}>
                        <div className={styles.similarBookTitle}>
                          {similar.title || "Untitled"}
                        </div>
                        <div className={styles.similarBookAuthor}>
                          by {getAuthorDisplay(similar.author).name}
                        </div>
                        {similar.ai_reason ? (
                          <p className={styles.aiRecReason}>{similar.ai_reason}</p>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </aside>
      </div>

      {followersOpen && (
        <div className={styles.modalOverlay} onClick={() => setFollowersOpen(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.modalTitle}>Followers</div>
              <button className={styles.modalClose} onClick={() => setFollowersOpen(false)}>
                ✕
              </button>
            </div>
            <div className={styles.modalBody}>
              {followers.length === 0 ? (
                <div className={styles.modalEmpty}>No followers yet.</div>
              ) : (
                followers.map((f) => (
                  <div key={f.id} className={styles.followerRow}>
                    <div className={styles.followerAvatar}>
                      {(f.follower?.first_name?.[0] || f.follower?.profile?.handle_name?.[0] || "U").toUpperCase()}
                    </div>
                    <div className={styles.followerInfo}>
                      <div className={styles.followerName}>
                        {[f.follower?.first_name, f.follower?.last_name].filter(Boolean).join(" ") || "Reader"}
                      </div>
                      {f.follower?.profile?.handle_name && (
                        <div className={styles.followerHandle}>@{f.follower.profile.handle_name}</div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && <div className={styles.toast}>{toast}</div>}
    </div>
  );
}

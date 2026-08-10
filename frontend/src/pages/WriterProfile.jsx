import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getWriterPublicProfile } from "../services/writerProfileService";
import { followWriter, getMyFollowingWriters, getWriterFollowers, unfollowWriter } from "../services/followService";
import { getPublicMoodboardsForUser } from "../services/moodboardService";
import { getMyProfile } from "../services/profileService";
import styles from "../styles/writerProfile.module.css";

export default function WriterProfile() {
  const { writerId } = useParams();
  const navigate = useNavigate();

  const wid = Number(writerId);

  const [writer, setWriter] = useState(null);
  const [books, setBooks] = useState([]);
  const [followersCount, setFollowersCount] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [isFollowing, setIsFollowing] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);

  const [_viewerRole, setViewerRole] = useState(null);
  const [viewerUserId, setViewerUserId] = useState(null);

  const [followersOpen, setFollowersOpen] = useState(false);
  const [followers, setFollowers] = useState([]);

  const [moodboards, setMoodboards] = useState([]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!wid) return;

      setLoading(true);
      setError(null);

      try {
        let me = null;
        try {
          const meRes = await getMyProfile();
          me = meRes.data || null;
        } catch {
          me = null;
        }

        if (!cancelled) {
          setViewerRole(me?.role || null);
          setViewerUserId(typeof me?.user_id === "number" ? me.user_id : null);
        }

        const promises = [getWriterPublicProfile(wid), getWriterFollowers(wid), getMyFollowingWriters()];

        const results = await Promise.all(promises);

        const profileRes = results[0];
        const followersRes = results[1];
        const followingRes = results[2];

        if (cancelled) return;

        setWriter(profileRes.data?.writer || null);
        setBooks(profileRes.data?.books || []);
        setFollowersCount(profileRes.data?.followersCount || 0);

        const following = followingRes?.data?.following || [];
        setIsFollowing(following.some((f) => f.writer_id === wid));

        setFollowers(followersRes.data?.followers || []);

        try {
          const mbRes = await getPublicMoodboardsForUser(wid);
          if (!cancelled) setMoodboards(mbRes.data || []);
        } catch (e) {
          console.error("Failed to load writer moodboards", e);
          if (!cancelled) setMoodboards([]);
        }
      } catch (e) {
        console.error("Failed to load writer profile", e);
        if (!cancelled) setError("Writer not found");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [wid]);

  const showFollow = viewerUserId && writer?.user_id && viewerUserId !== writer.user_id;

  const displayName = () => {
    if (!writer) return "Writer";
    // Prefer profile names over user table names (profile is where users update their display name)
    const firstName = writer.profile?.first_name || writer.first_name;
    const lastName = writer.profile?.last_name || writer.last_name;
    const name = [firstName, lastName].filter(Boolean).join(" ").trim();
    return name || writer.profile?.handle_name || "Writer";
  };

  const handleToggleFollow = async () => {
    if (!writer?.user_id) return;

    setFollowBusy(true);
    try {
      if (isFollowing) {
        await unfollowWriter(writer.user_id);
        setIsFollowing(false);
        setFollowersCount((c) => Math.max(0, c - 1));
      } else {
        await followWriter(writer.user_id);
        setIsFollowing(true);
        setFollowersCount((c) => c + 1);
      }
    } catch (e) {
      console.error("Toggle follow failed", e);
    } finally {
      setFollowBusy(false);
    }
  };

  const openStory = (storyId) => {
    navigate(`/story/${storyId}`);
  };

  const openMoodboard = (moodboardId) => {
    navigate("/mood-board", { state: { moodboardId } });
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.card}>Loading…</div>
      </div>
    );
  }

  if (error || !writer) {
    return (
      <div className={styles.page}>
        <div className={styles.card}>{error || "Writer not found"}</div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <section className={styles.heroSection}>
        <div className={styles.gradientHalo} />
        <div className={styles.heroCard}>
          <div className={styles.heroHeader}>
            <div className={styles.identity}>
              <div className={styles.avatarShell}>
                {writer.profile?.profile_image ? (
                  <img src={writer.profile.profile_image} alt="Writer" />
                ) : (
                  <span>{(displayName()[0] || "W").toUpperCase()}</span>
                )}
              </div>
              <div>
                <div className={styles.name}>{displayName()}</div>
                {writer.profile?.handle_name && <div className={styles.handle}>@{writer.profile.handle_name}</div>}
                <div className={styles.badgeRow}>
                  <span className={styles.badge}>Writer</span>
                  {writer.profile?.role === "writer" && <span className={styles.badgeSoft}>Golden User</span>}
                </div>
              </div>
            </div>
            <div className={styles.heroActions}>
              {showFollow && (
                <button
                  className={`${styles.primaryAction} ${isFollowing ? styles.following : ""}`}
                  onClick={handleToggleFollow}
                  disabled={followBusy}
                >
                  {followBusy ? "…" : isFollowing ? "Following" : "Follow"}
                </button>
              )}
              <button className={styles.ghostAction} onClick={() => setFollowersOpen(true)}>
                {followersCount} followers
              </button>
            </div>
          </div>
          {writer.profile?.bio && <p className={styles.bio}>{writer.profile.bio}</p>}
          <div className={styles.pillRow}>
            <button className={styles.pillButton} type="button" onClick={() => openStory(books[0]?.story_id)}>
              Latest release
            </button>
            <button className={styles.pillButton} type="button" onClick={() => setFollowersOpen(true)}>
              See followers
            </button>
          </div>
        </div>
        <div className={styles.statBar}>
          <div>
            <p>Total books</p>
            <strong>{books.length}</strong>
          </div>
          <div>
            <p>Followers</p>
            <strong>{followersCount}</strong>
          </div>
          <div>
            <p>Moodboards</p>
            <strong>{moodboards.length}</strong>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeading}>
          <div>
            <h2>Published Books</h2>
            <p>Tap a card to jump into the story.</p>
          </div>
        </div>
        <div className={styles.grid}>
          {books.length === 0 ? (
            <div className={styles.empty}>No published books yet.</div>
          ) : (
            books.map((b) => (
              <button key={b.story_id} className={styles.bookCard} onClick={() => openStory(b.story_id)}>
                {b.cover_url ? (
                  <img src={b.cover_url} alt={b.title || "Book"} className={styles.cover} />
                ) : (
                  <div className={styles.coverPlaceholder}>📖</div>
                )}
                <div className={styles.bookInfo}>
                  <div className={styles.bookTitle}>{b.title || `Story #${b.story_id}`}</div>
                  <div className={styles.bookMeta}>
                    {(b.total_chapters || 0)} chapters · {(b.estimated_minutes || 0)} min
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeading}>
          <div>
            <h2>Public Moodboards</h2>
            <p>Peek at the visuals inspiring this writer.</p>
          </div>
        </div>
        <div className={styles.grid}>
          {moodboards.length === 0 ? (
            <div className={styles.empty}>No public moodboards yet.</div>
          ) : (
            moodboards.slice(0, 12).map((mb) => (
              <button
                key={mb.moodboard_id}
                className={styles.bookCard}
                onClick={() => openMoodboard(mb.moodboard_id)}
              >
                {mb.previewImages && mb.previewImages.length > 0 ? (
                  <div className={styles.moodboardPreview}>
                    {mb.previewImages.slice(0, 4).map((img, idx) => (
                      <div key={idx} className={styles.moodboardPreviewCell}>
                        <img src={img} alt="" />
                      </div>
                    ))}
                    {mb.previewImages.length < 4 &&
                      Array.from({ length: 4 - mb.previewImages.length }).map((_, idx) => (
                        <div key={`empty-${idx}`} className={styles.moodboardPreviewCell}>
                          <span>🎨</span>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className={styles.coverPlaceholder}>🎨</div>
                )}
                <div className={styles.bookInfo}>
                  <div className={styles.bookTitle}>{mb.title || "Moodboard"}</div>
                  <div className={styles.bookMeta}>
                    {mb.updated_at ? new Date(mb.updated_at).toLocaleDateString() : ""}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </section>

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
    </div>
  );
}

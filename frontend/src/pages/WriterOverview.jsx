import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getMyProfile } from "../services/profileService";
import { getWriterPublicProfile } from "../services/writerProfileService";
import { getMyFollowingWriters } from "../services/followService";
import { getPublicMoodboardsForUser } from "../services/moodboardService";
import styles from "../styles/writerOverview.module.css";

export default function WriterOverview() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [me, setMe] = useState(null);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [books, setBooks] = useState([]);
  const [moodboards, setMoodboards] = useState([]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const meRes = await getMyProfile();
        const myProfile = meRes.data;

        if (!myProfile?.user_id) {
          throw new Error("Profile not found");
        }

        if (myProfile?.role !== "writer") {
          if (cancelled) return;
          setMe(myProfile);
          setError("Writer access required");
          return;
        }

        const [writerRes, followingRes, moodboardsRes] = await Promise.all([
          getWriterPublicProfile(myProfile.user_id),
          getMyFollowingWriters(),
          getPublicMoodboardsForUser(myProfile.user_id),
        ]);

        if (cancelled) return;

        setMe(myProfile);
        setFollowersCount(writerRes.data?.followersCount || 0);

        const following = followingRes.data?.following || [];
        setFollowingCount(following.length);

        setBooks(writerRes.data?.books || []);
        setMoodboards(moodboardsRes.data || []);
      } catch (e) {
        console.error("Failed to load writer overview", e);
        if (!cancelled) setError("Failed to load writer overview");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.card}>Loading…</div>
      </div>
    );
  }

  if (error || !me) {
    return (
      <div className={styles.page}>
        <div className={styles.card}>{error || "Unable to load"}</div>
      </div>
    );
  }

  const displayName = [me.first_name, me.last_name].filter(Boolean).join(" ") || "Writer";

  return (
    <div className={styles.page}>
      <section className={styles.heroShell}>
        <div className={styles.heroBackdrop} />
        <div className={styles.heroCard}>
          <div className={styles.heroHeader}>
            <div className={styles.heroIdentity}>
              <div className={styles.avatarOrb}>
                {me.profile_image ? (
                  <img src={me.profile_image} alt="Profile" />
                ) : (
                  <span>{(displayName[0] || "W").toUpperCase()}</span>
                )}
              </div>
              <div>
                <p className={styles.heroRole}>Writer overview</p>
                <h1 className={styles.heroName}>{displayName}</h1>
                <p className={styles.heroHandle}>@{me.handle_name || "writer"}</p>
                <div className={styles.badgeRow}>
                  <span className={styles.badgeFilled}>{me.role === "writer" ? "Writer" : me.role}</span>
                  <span className={styles.badgeGhost}>Golden User</span>
                </div>
              </div>
            </div>
            <div className={styles.heroActions}>
              <Link to={`/writer/${me.user_id}`} className={styles.primaryBtn}>
                View public profile
              </Link>
              <button className={styles.secondaryBtn} type="button" onClick={() => navigate("/profile/settings")}>
                Profile settings
              </button>
            </div>
          </div>
          <div className={styles.heroStats}>
            <div>
              <span>Followers</span>
              <strong>{followersCount}</strong>
            </div>
            <div>
              <span>Following</span>
              <strong>{followingCount}</strong>
            </div>
            <div>
              <span>Published books</span>
              <strong>{books.length}</strong>
            </div>
            <div>
              <span>Moodboards</span>
              <strong>{moodboards.length}</strong>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeading}>
          <div>
            <h2>Published books</h2>
            <p>Quick access to everything you’ve shared.</p>
          </div>
        </div>
        <div className={styles.grid}>
          {books.length === 0 ? (
            <div className={styles.empty}>No published books yet.</div>
          ) : (
            books.map((b) => (
              <button
                key={b.story_id}
                className={styles.itemCard}
                type="button"
                onClick={() => navigate(`/story/${b.story_id}`)}
              >
                <div className={styles.itemTitle}>{b.title || `Story #${b.story_id}`}</div>
                <div className={styles.itemMeta}>
                  {(b.total_chapters || 0)} chapters · {(b.estimated_minutes || 0)} min
                </div>
              </button>
            ))
          )}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeading}>
          <div>
            <h2>Public moodboards</h2>
            <p>Inspiration pools readers can peek at.</p>
          </div>
        </div>
        <div className={styles.grid}>
          {moodboards.length === 0 ? (
            <div className={styles.empty}>No public moodboards yet.</div>
          ) : (
            moodboards.slice(0, 12).map((mb) => (
              <button
                key={mb.moodboard_id}
                className={styles.itemCard}
                type="button"
                onClick={() => navigate("/mood-board", { state: { moodboardId: mb.moodboard_id } })}
              >
                <div className={styles.itemTitle}>{mb.title || "Moodboard"}</div>
                <div className={styles.itemMeta}>
                  {mb.updated_at ? new Date(mb.updated_at).toLocaleDateString() : ""}
                </div>
              </button>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

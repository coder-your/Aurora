import React, { useEffect, useState, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  getMyMoodboards,
  createMoodboard,
  updateMoodboard,
  deleteMoodboard,
  getMoodboard,
  getVibe,
  upsertVibe,
  getCharacters,
  createCharacter,
  getPlotNotes,
  createNote,
  getTimeline,
  getLocations,
  createLocation,
  getWorldMeta,
  getQuotes,
  createQuote,
  getTracks,
  createTrack,
  getInspirations,
  createInspiration,
  uploadMoodboardAsset,
} from "../services/moodboardService";
import { getWriterDashboard } from "../services/bookService";
import { getMyProfile } from "../services/profileService";
import styles from "../styles/moodBoard.module.css";

const FEATURES = [
  { id: "all", label: "View All", icon: "📋" },
  { id: "vibe", label: "Story Vibe", icon: "✨" },
  { id: "characters", label: "Characters", icon: "👤" },
  { id: "plot", label: "Plot & Scenes", icon: "🧩" },
  { id: "world", label: "World-Building", icon: "🌍" },
  { id: "quotes", label: "Quotes", icon: "💬" },
  { id: "inspiration", label: "Inspiration", icon: "📌" },
  { id: "soundtrack", label: "Soundtrack", icon: "🎧" },
];

export default function MoodBoard() {
  const location = useLocation();
  const navigate = useNavigate();
  const initialStoryId = location.state?.storyId ? Number(location.state.storyId) : null;
  const initialStoryTitle = location.state?.storyTitle || "";
  const initialMoodboardId = location.state?.moodboardId ? Number(location.state.moodboardId) : null;

  // View mode: "gallery" | "board"
  const [viewMode, setViewMode] = useState("gallery");
  const [activeFeature, setActiveFeature] = useState("all");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [myBoards, setMyBoards] = useState([]);
  const [moodboard, setMoodboard] = useState(null);
  const [myProfile, setMyProfile] = useState(null);
  const [vibe, setVibe] = useState(null);
  const [characters, setCharacters] = useState([]);
  const [notes, setNotes] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [locations, setLocations] = useState([]);
  const [worldMeta, setWorldMeta] = useState(null);
  const [quotes, setQuotes] = useState([]);
  const [tracks, setTracks] = useState([]);
  const [inspirations, setInspirations] = useState([]);

  const [boardScope] = useState(initialStoryId ? "story" : "all");

  const [sortOption] = useState("updated");
  const [writerBooks, setWriterBooks] = useState([]);

  // Quick add states
  const [newChar, setNewChar] = useState({ name: "", age: "", role: "", image_url: "" });
  const [savingChar, setSavingChar] = useState(false);
  const [uploadingCharImage, setUploadingCharImage] = useState(false);

  const [newNote, setNewNote] = useState({ title: "", content: "", kind: "idea" });
  const [savingNote, setSavingNote] = useState(false);

  const [newQuote, setNewQuote] = useState({ text: "", speaker: "", tone: "" });
  const [savingQuote, setSavingQuote] = useState(false);

  const [uploadingVibeImage, setUploadingVibeImage] = useState(false);
  const [newVibeTheme, setNewVibeTheme] = useState("");
  const [savingVibeTheme, setSavingVibeTheme] = useState(false);

  const [newLocation, setNewLocation] = useState({ name: "", kind: "", notes: "", image_url: "" });
  const [savingLocation, setSavingLocation] = useState(false);
  const [uploadingLocationImage, setUploadingLocationImage] = useState(false);

  const [newInspiration, setNewInspiration] = useState({ type: "image", title: "", url: "" });
  const [savingInspiration, setSavingInspiration] = useState(false);
  const [uploadingInspiration, setUploadingInspiration] = useState(false);

  const [newTrack, setNewTrack] = useState({ kind: "spotify_playlist", label: "", spotify_url: "", scene_label: "" });
  const [savingTrack, setSavingTrack] = useState(false);

  const [newBoard, setNewBoard] = useState({ title: "", description: "" });
  const [creatingBoard, setCreatingBoard] = useState(false);

  const [readerNotice, setReaderNotice] = useState("");

  const isLikelyImageUrl = (url) => {
    if (!url || typeof url !== "string") return false;
    const u = url.toLowerCase();
    return (
      u.endsWith(".png") ||
      u.endsWith(".jpg") ||
      u.endsWith(".jpeg") ||
      u.endsWith(".webp") ||
      u.endsWith(".gif")
    );
  };

  const moodboardId = useMemo(() => moodboard?.moodboard_id, [moodboard]);
  const isOwner = useMemo(() => {
    if (!moodboard || !myProfile) return false;
    return moodboard.owner_id === myProfile.user_id;
  }, [moodboard, myProfile]);

  const loadBoardAndSections = async (board) => {
    if (!board) return;
    try {
      setLoading(true);
      setError("");

      const id = board.moodboard_id;
      setMoodboard(board);

      // If viewer is not the owner, keep it lightweight (reader/static view)
      const viewerId = myProfile?.user_id;
      const viewerIsOwner = viewerId && board.owner_id === viewerId;
      if (!viewerIsOwner) {
        setVibe(null);
        setCharacters([]);
        setNotes([]);
        setTimeline([]);
        setLocations([]);
        setWorldMeta(null);
        setQuotes([]);

        const [tracksRes, inspRes] = await Promise.all([
          getTracks(id).catch(() => ({ data: [] })),
          getInspirations(id).catch(() => ({ data: Array.isArray(board?.inspirations) ? board.inspirations : [] })),
        ]);

        setTracks(tracksRes.data || []);
        setInspirations(inspRes.data || []);
        return;
      }

      const [vibeRes, charsRes, notesRes, timelineRes, locRes, worldRes, quotesRes, tracksRes, inspRes] =
        await Promise.all([
          getVibe(id).catch(() => ({ data: null })),
          getCharacters(id).catch(() => ({ data: [] })),
          getPlotNotes(id).catch(() => ({ data: [] })),
          getTimeline(id).catch(() => ({ data: [] })),
          getLocations(id).catch(() => ({ data: [] })),
          getWorldMeta(id).catch(() => ({ data: null })),
          getQuotes(id).catch(() => ({ data: [] })),
          getTracks(id).catch(() => ({ data: [] })),
          getInspirations(id).catch(() => ({ data: [] })),
        ]);

      console.log("Vibe response on board load:", vibeRes.data);
      const panel = vibeRes.data?.panel
        ? {
            ...vibeRes.data.panel,
            color_palette: vibeRes.data.panel.color_palette
              ? JSON.parse(vibeRes.data.panel.color_palette)
              : [],
            images: vibeRes.data.panel.images ? JSON.parse(vibeRes.data.panel.images) : [],
            themes: vibeRes.data.panel.themes ? JSON.parse(vibeRes.data.panel.themes) : [],
          }
        : null;
      console.log("Parsed vibe panel on load:", panel);
      setVibe(panel);
      setCharacters(charsRes.data || []);
      setNotes(notesRes.data || []);
      setTimeline(timelineRes.data || []);
      setLocations(locRes.data || []);
      setWorldMeta(worldRes.data || null);
      setQuotes(quotesRes.data || []);
      setTracks(tracksRes.data || []);
      setInspirations(inspRes.data || []);
    } catch (err) {
      console.error("Failed to load moodboard:", err);
      setError("Failed to load moodboard.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError("");

        const profileRes = await getMyProfile().catch(() => ({ data: null }));
        setMyProfile(profileRes.data || null);

        // Readers should only access this page via a specific public moodboardId.
        // If they land here without one, don't call writer-only endpoints.
        if (!initialMoodboardId && profileRes.data && profileRes.data.role !== "writer") {
          setMyBoards([]);
          setLoading(false);
          return;
        }

        if (initialMoodboardId) {
          const boardRes = await getMoodboard(initialMoodboardId);
          await loadBoardAndSections(boardRes.data);
          setViewMode("board");
          setActiveFeature("all");
          setLoading(false);
          return;
        }

        const scopeStoryId = boardScope === "story" && initialStoryId ? initialStoryId : null;
        const mineRes = await getMyMoodboards(scopeStoryId, { sort: sortOption });
        const mine = Array.isArray(mineRes.data) ? mineRes.data : [];
        setMyBoards(mine);
        setLoading(false);
      } catch (err) {
        console.error("Failed to load moodboards:", err);
        setError("Failed to load moodboards.");
        setLoading(false);
      }
    };

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardScope, initialStoryId, sortOption, initialMoodboardId]);

  useEffect(() => {
    const loadBooks = async () => {
      try {
        if (!myProfile || myProfile.role !== "writer") {
          setWriterBooks([]);
          return;
        }
        const dash = await getWriterDashboard();
        const all = [...(dash?.drafts || []), ...(dash?.in_progress || []), ...(dash?.published || [])];
        setWriterBooks(all);
      } catch {
        setWriterBooks([]);
      }
    };
    loadBooks();
  }, [myProfile]);

  // Open a specific board
  const openBoard = async (board) => {
    await loadBoardAndSections(board);
    setViewMode("board");
    setActiveFeature("all");
  };

  // Go back to gallery
  const backToGallery = () => {
    setViewMode("gallery");
    setMoodboard(null);
    setActiveFeature("all");
  };

  // Create new board
  const handleCreateBoard = async () => {
    if (!newBoard.title.trim()) return;
    if (!myProfile || myProfile.role !== "writer") return;
    try {
      setCreatingBoard(true);
      const res = await createMoodboard({
        title: newBoard.title,
        description: newBoard.description || null,
        visibility: "private",
        ...(boardScope === "story" && initialStoryId ? { story_id: initialStoryId } : {}),
      });
      setNewBoard({ title: "", description: "" });
      setShowCreateModal(false);

      const scopeStoryId = boardScope === "story" && initialStoryId ? initialStoryId : null;
      const mineRes = await getMyMoodboards(scopeStoryId, { sort: sortOption });
      const mine = Array.isArray(mineRes.data) ? mineRes.data : [];
      setMyBoards(mine);

      // Open the newly created board
      await openBoard(res.data);
    } catch (err) {
      console.error("Failed to create moodboard:", err);
    } finally {
      setCreatingBoard(false);
    }
  };

  const readerImageUrls = useMemo(() => {
    const urls = [];

    const fromVibe = Array.isArray(moodboard?.vibe_panel?.images)
      ? moodboard.vibe_panel.images
          .map((i) => {
            if (!i) return null;
            if (typeof i === "string") return i;
            return i.url || i.src || null;
          })
          .filter(Boolean)
      : [];
    urls.push(...fromVibe);

    const fromCover = Array.isArray(moodboard?.cover_images) ? moodboard.cover_images : [];
    urls.push(...fromCover);

    const fromInspirations = Array.isArray(moodboard?.inspirations)
      ? moodboard.inspirations.map((x) => x?.url).filter(Boolean)
      : [];
    urls.push(...fromInspirations);

    const fromChars = Array.isArray(moodboard?.characters)
      ? moodboard.characters.map((c) => c?.image_url).filter(Boolean)
      : [];
    urls.push(...fromChars);

    const fromLocs = Array.isArray(moodboard?.locations)
      ? moodboard.locations.map((l) => l?.image_url).filter(Boolean)
      : [];
    urls.push(...fromLocs);

    const seen = new Set();
    const out = [];
    for (const u of urls) {
      if (!u || seen.has(u)) continue;
      seen.add(u);
      out.push(u);
    }
    return out;
  }, [moodboard]);

  const readerInspirations = useMemo(() => {
    const list = Array.isArray(moodboard?.inspirations) ? moodboard.inspirations : [];
    return list
      .map((i) => {
        let meta = null;
        try {
          meta = i?.meta ? JSON.parse(i.meta) : null;
        } catch {
          meta = null;
        }
        const tags = Array.isArray(meta?.tags) ? meta.tags.filter(Boolean) : [];
        return {
          id: i?.id,
          type: i?.type,
          title: i?.title,
          source: i?.source,
          url: i?.url,
          content: i?.content,
          tags,
        };
      })
      .filter((i) => i.id);
  }, [moodboard]);

  const renderBoardCover = (board) => {
    const fromCoverImages = Array.isArray(board?.cover_images) ? board.cover_images : [];
    const fromVibe = Array.isArray(board?.vibe_panel?.images)
      ? board.vibe_panel.images.map((i) => i?.url).filter(Boolean)
      : [];
    const urls = [...fromCoverImages, ...fromVibe].filter(Boolean).slice(0, 4);

    if (!urls.length) {
      return (
        <div
          style={{
            height: 140,
            background: "linear-gradient(135deg, #e8c96e 0%, #f0d78a 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span style={{ fontSize: "3rem" }}>🎨</span>
        </div>
      );
    }

    const gridTemplate =
      urls.length === 1
        ? "1fr"
        : urls.length === 2
          ? "1fr 1fr"
          : "1fr 1fr";

    return (
      <div
        style={{
          height: 140,
          display: "grid",
          gridTemplateColumns: gridTemplate,
          gridTemplateRows: urls.length <= 2 ? "1fr" : "1fr 1fr",
          gap: 2,
          backgroundColor: "#f3f4f6",
        }}
      >
        {urls.map((url) => (
          <div
            key={url}
            style={{
              backgroundImage: `url(${url})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              width: "100%",
              height: "100%",
            }}
          />
        ))}
      </div>
    );
  };

  // ============ GALLERY VIEW ============
  if (viewMode === "gallery") {
    // Moodboards are writer-only. Readers should only land here via a specific public moodboardId.
    if (myProfile && myProfile.role !== "writer") {
      return (
        <div className={styles.page} style={{ display: "block", padding: "32px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, marginBottom: 18 }}>
            <h1 style={{ margin: 0, fontSize: "1.8rem", fontWeight: 700, color: "#1f2933" }}>Moodboards</h1>
          </div>
          <div
            style={{
              backgroundColor: "#fff",
              border: "1px solid #e4dfdb",
              borderRadius: 16,
              padding: 20,
              color: "#6b7280",
              maxWidth: 720,
            }}
          >
            Moodboards are available for writers only.
          </div>
        </div>
      );
    }

    return (
      <div className={styles.page} style={{ display: "block", padding: "32px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, marginBottom: 18 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: "1.8rem", fontWeight: 700, color: "#1f2933" }}>My Moodboards</h1>
            {initialStoryTitle && (
              <div style={{ marginTop: 6, color: "#6b7280" }}>For: {initialStoryTitle}</div>
            )}
          </div>

          {myProfile?.role === "writer" && (
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              style={{
                padding: "10px 14px",
                borderRadius: 10,
                border: "1px solid #e4dfdb",
                backgroundColor: "#e8c96e",
                cursor: "pointer",
                fontWeight: 700,
              }}
            >
              + New Moodboard
            </button>
          )}
        </div>

        {loading && <p style={{ color: "#6b7280" }}>Loading...</p>}
        {error && <p style={{ color: "#ef4444" }}>{error}</p>}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: 24,
          }}
        >
          {myBoards.map((board) => (
            <div
              key={board.moodboard_id}
              onClick={() => openBoard(board)}
              style={{
                minHeight: 200,
                borderRadius: 16,
                overflow: "hidden",
                cursor: "pointer",
                backgroundColor: "#fff",
                boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
                transition: "transform 0.2s, box-shadow 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-4px)";
                e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.12)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,0.08)";
              }}
            >
              {renderBoardCover(board)}
              <div style={{ padding: 16 }}>
                <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 600, color: "#1f2933" }}>{board.title || "Untitled Board"}</h3>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
                  <span
                    style={{
                      fontSize: "0.75rem",
                      padding: "4px 10px",
                      borderRadius: 999,
                      backgroundColor: board.visibility === "public" ? "#d1fae5" : "#f3f4f6",
                      color: "#111827",
                    }}
                  >
                    {board.visibility === "public" ? "Public" : "Private"}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {showCreateModal && myProfile?.role === "writer" && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              backgroundColor: "rgba(0,0,0,0.5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 1000,
            }}
            onClick={() => setShowCreateModal(false)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                backgroundColor: "#fff",
                borderRadius: 16,
                padding: 32,
                width: 420,
                maxWidth: "92vw",
              }}
            >
              <h2 style={{ margin: "0 0 20px", fontSize: "1.5rem", fontWeight: 700 }}>Create New Moodboard</h2>
              <input
                type="text"
                placeholder="Board title..."
                value={newBoard.title}
                onChange={(e) => setNewBoard((p) => ({ ...p, title: e.target.value }))}
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  borderRadius: 10,
                  border: "1px solid #e4dfdb",
                  fontSize: "1rem",
                  marginBottom: 12,
                  boxSizing: "border-box",
                }}
              />
              <textarea
                placeholder="Description (optional)..."
                value={newBoard.description}
                onChange={(e) => setNewBoard((p) => ({ ...p, description: e.target.value }))}
                rows={3}
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  borderRadius: 10,
                  border: "1px solid #e4dfdb",
                  fontSize: "1rem",
                  marginBottom: 18,
                  resize: "none",
                  boxSizing: "border-box",
                }}
              />
              <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  style={{
                    padding: "10px 16px",
                    borderRadius: 10,
                    border: "1px solid #e4dfdb",
                    backgroundColor: "#fff",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreateBoard}
                  disabled={creatingBoard || !newBoard.title.trim()}
                  style={{
                    padding: "10px 16px",
                    borderRadius: 10,
                    border: "none",
                    backgroundColor: "#e8c96e",
                    fontWeight: 800,
                    cursor: creatingBoard ? "default" : "pointer",
                  }}
                >
                  {creatingBoard ? "Creating..." : "Create"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ============ BOARD VIEW ============

  // Reader / non-owner view: Pinterest-like gallery of all images
  if (viewMode === "board" && moodboard && !isOwner) {
    const connectedTitle = moodboard?.story?.title;
    const connectedStoryId = moodboard?.story?.story_id;
    const connectedStatus = moodboard?.story?.status;
    const author = moodboard?.owner;
    const authorName = author?.profile?.handle_name || [author?.first_name, author?.last_name].filter(Boolean).join(" ") || "";

    const safeExternalUrl = (url) => {
      if (!url || typeof url !== "string") return null;
      const u = url.trim();
      if (!u) return null;
      if (u.startsWith("http://") || u.startsWith("https://")) return u;
      return null;
    };

    const youtubeLinks = (tracks || [])
      .filter((t) => {
        const u = (t?.spotify_url || "").toLowerCase();
        return t?.kind === "youtube" || u.includes("youtube.com") || u.includes("youtu.be");
      })
      .map((t) => ({
        label: t?.label || "YouTube",
        url: safeExternalUrl(t?.spotify_url),
      }))
      .filter((x) => x.url);

    const spotifyLinks = (tracks || [])
      .filter((t) => {
        const u = (t?.spotify_url || "").toLowerCase();
        return (t?.kind || "").startsWith("spotify") || u.includes("open.spotify.com") || u.includes("spotify.com");
      })
      .map((t) => ({
        label: t?.label || "Spotify",
        url: safeExternalUrl(t?.spotify_url),
      }))
      .filter((x) => x.url);

    const pinterestLinks = (readerInspirations || [])
      .filter((i) => {
        const u = (i?.url || "").toLowerCase();
        const src = (i?.source || "").toLowerCase();
        return u.includes("pinterest.") || src.includes("pinterest");
      })
      .map((i) => ({
        label: i?.title || "Pinterest",
        url: safeExternalUrl(i?.url),
      }))
      .filter((x) => x.url);

    const hasExternalLinks = youtubeLinks.length + spotifyLinks.length + pinterestLinks.length > 0;

    return (
      <div className={styles.page} style={{ display: "block", padding: "32px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, marginBottom: 18 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: "1.8rem", fontWeight: 700, color: "#1f2933" }}>
              {moodboard.title || "Moodboard"}
            </h1>
            <div style={{ marginTop: 6, color: "#6b7280", fontSize: "0.95rem" }}>
              {authorName ? `by ${authorName}` : ""}
            </div>
            {connectedTitle && (
              <div style={{ marginTop: 10 }}>
                <button
                  type="button"
                  onClick={() => {
                    if (!connectedStoryId) return;
                    if (connectedStatus !== "published") {
                      setReaderNotice("Not published yet");
                      return;
                    }
                    navigate(`/story/${connectedStoryId}`);
                  }}
                  style={{
                    display: "inline-block",
                    padding: "6px 10px",
                    borderRadius: 999,
                    backgroundColor: "#fff6d9",
                    color: "#92710c",
                    fontSize: 12,
                    fontWeight: 600,
                    border: "1px solid rgba(0,0,0,0.06)",
                    cursor: connectedStoryId ? "pointer" : "default",
                  }}
                >
                  Connected to: {connectedTitle}
                </button>
              </div>
            )}

            {readerNotice && (
              <div style={{ marginTop: 10, color: "#b45309", fontSize: 13, fontWeight: 600 }}>
                {readerNotice}
              </div>
            )}
          </div>

          <button
            onClick={backToGallery}
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              border: "1px solid #e4dfdb",
              backgroundColor: "#fff",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            Back
          </button>
        </div>

        {loading && <p style={{ color: "#6b7280" }}>Loading...</p>}

        {!loading && (
          <>
            {hasExternalLinks && (
              <div
                style={{
                  backgroundColor: "#fff",
                  border: "1px solid #e4dfdb",
                  borderRadius: 14,
                  padding: 14,
                  marginBottom: 16,
                }}
              >
                <div style={{ fontWeight: 800, color: "#1f2933", marginBottom: 10 }}>Links</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                  {youtubeLinks.map((l) => (
                    <a
                      key={`yt-${l.url}`}
                      href={l.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        padding: "8px 12px",
                        borderRadius: 999,
                        border: "1px solid rgba(0,0,0,0.08)",
                        backgroundColor: "#fff",
                        textDecoration: "none",
                        color: "#111827",
                        fontWeight: 700,
                        fontSize: 13,
                      }}
                    >
                      YouTube: {l.label} →
                    </a>
                  ))}
                  {pinterestLinks.map((l) => (
                    <a
                      key={`pin-${l.url}`}
                      href={l.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        padding: "8px 12px",
                        borderRadius: 999,
                        border: "1px solid rgba(0,0,0,0.08)",
                        backgroundColor: "#fff",
                        textDecoration: "none",
                        color: "#111827",
                        fontWeight: 700,
                        fontSize: 13,
                      }}
                    >
                      Pinterest: {l.label} →
                    </a>
                  ))}
                  {spotifyLinks.map((l) => (
                    <a
                      key={`sp-${l.url}`}
                      href={l.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        padding: "8px 12px",
                        borderRadius: 999,
                        border: "1px solid rgba(0,0,0,0.08)",
                        backgroundColor: "#fff",
                        textDecoration: "none",
                        color: "#111827",
                        fontWeight: 700,
                        fontSize: 13,
                      }}
                    >
                      Spotify: {l.label} →
                    </a>
                  ))}
                </div>
              </div>
            )}

            <div
              style={{
                columnCount: 4,
                columnGap: 16,
              }}
            >
            {readerImageUrls.length === 0 ? (
              <div
                style={{
                  breakInside: "avoid",
                  marginBottom: 16,
                  borderRadius: 14,
                  padding: 16,
                  backgroundColor: "#fff",
                  border: "1px solid #e4dfdb",
                  color: "#6b7280",
                }}
              >
                This moodboard doesn’t have any images yet.
              </div>
            ) : (
              readerImageUrls.map((url) => (
                <div
                  key={url}
                  style={{
                    breakInside: "avoid",
                    marginBottom: 16,
                    borderRadius: 14,
                    overflow: "hidden",
                    backgroundColor: "#f3f4f6",
                    boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
                  }}
                >
                  <img
                    src={url}
                    alt="Moodboard"
                    style={{ width: "100%", height: "auto", display: "block" }}
                    loading="lazy"
                  />
                </div>
              ))
            )}

            {readerInspirations
              .filter((i) => i.url)
              .map((i) => {
                const imagePin = i.type === "image" || isLikelyImageUrl(i.url);
                const label = i.title || i.url || "Link";

                return (
                  <a
                    key={`insp-${i.id}`}
                    href={i.url}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      breakInside: "avoid",
                      marginBottom: 16,
                      borderRadius: 14,
                      overflow: "hidden",
                      backgroundColor: "#fff",
                      border: "1px solid rgba(0,0,0,0.06)",
                      boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
                      display: "block",
                      textDecoration: "none",
                      color: "inherit",
                    }}
                  >
                    {imagePin ? (
                      <img
                        src={i.url}
                        alt={label}
                        style={{ width: "100%", height: "auto", display: "block" }}
                        loading="lazy"
                      />
                    ) : (
                      <div style={{ padding: 14 }}>
                        <div style={{ fontWeight: 800, color: "#1f2933", marginBottom: 6, lineHeight: 1.2 }}>
                          {label}
                        </div>
                        {(i.source || i.type) && (
                          <div style={{ fontSize: 12, color: "#6b7280" }}>
                            {[i.type, i.source].filter(Boolean).join(" • ")}
                          </div>
                        )}
                      </div>
                    )}

                    {(i.title || i.tags?.length > 0) && (
                      <div style={{ padding: 12 }}>
                        {i.title && (
                          <div style={{ fontWeight: 800, color: "#1f2933", marginBottom: 8, lineHeight: 1.2 }}>
                            {i.title}
                          </div>
                        )}
                        {i.tags?.length > 0 && (
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                            {i.tags.slice(0, 8).map((t) => (
                              <span
                                key={`${i.id}-${t}`}
                                style={{
                                  fontSize: 12,
                                  padding: "4px 10px",
                                  borderRadius: 999,
                                  backgroundColor: "#f3f4f6",
                                  color: "#111827",
                                  border: "1px solid rgba(0,0,0,0.04)",
                                }}
                              >
                                #{t}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </a>
                );
              })}
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className={styles.page} style={{ display: "block" }}>
      {/* Top Navigation Bar */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 100,
          backgroundColor: "#fff",
          borderBottom: "1px solid #e4dfdb",
          padding: "16px 32px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {/* Back Button */}
          <button
            onClick={backToGallery}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 16px",
              borderRadius: 8,
              border: "1px solid #e4dfdb",
              backgroundColor: "#fff",
              cursor: "pointer",
              fontSize: "0.9rem",
            }}
          >
            ← Back to Boards
          </button>

          {/* Board Title */}
          <h1 style={{ margin: 0, fontSize: "1.4rem", fontWeight: 600, color: "#1f2933" }}>
            {moodboard?.title || "Mood Board"}
          </h1>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {isOwner && (
            <>
              <button
                onClick={async () => {
                  if (!moodboardId) return;
                  try {
                    const next = moodboard?.visibility === "public" ? "private" : "public";
                    const res = await updateMoodboard(moodboardId, { visibility: next });
                    setMoodboard(res.data);
                    setMyBoards((prev) =>
                      prev.map((b) =>
                        b.moodboard_id === moodboardId ? { ...b, visibility: res.data.visibility } : b
                      )
                    );
                  } catch (err) {
                    console.error("Failed to toggle visibility:", err);
                  }
                }}
                style={{
                  padding: "10px 14px",
                  borderRadius: 10,
                  border: "1px solid #e4dfdb",
                  backgroundColor: moodboard?.visibility === "public" ? "#d1fae5" : "#fff",
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                {moodboard?.visibility === "public" ? "Public" : "Private"}
              </button>

              <select
                value={moodboard?.story_id || ""}
                onChange={async (e) => {
                  if (!moodboardId) return;
                  const nextStoryId = e.target.value ? Number(e.target.value) : null;
                  try {
                    const res = await updateMoodboard(moodboardId, { story_id: nextStoryId });
                    setMoodboard(res.data);
                  } catch (err) {
                    console.error("Failed to connect moodboard to book:", err);
                  }
                }}
                style={{
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: "1px solid #e4dfdb",
                  backgroundColor: "#fff",
                  cursor: "pointer",
                  minWidth: 220,
                }}
              >
                <option value="">Not connected to a book</option>
                {writerBooks.map((b) => (
                  <option key={b.story_id} value={b.story_id}>
                    {b.title || `Untitled (#${b.story_id})`}
                  </option>
                ))}
              </select>

              <button
                onClick={async () => {
                  if (!moodboardId) return;
                  try {
                    await deleteMoodboard(moodboardId);
                    setMyBoards((prev) => prev.filter((b) => b.moodboard_id !== moodboardId));
                    backToGallery();
                  } catch (err) {
                    console.error("Failed to delete moodboard:", err);
                  }
                }}
                style={{
                  padding: "10px 14px",
                  borderRadius: 10,
                  border: "1px solid #fecaca",
                  backgroundColor: "#fff",
                  cursor: "pointer",
                  color: "#ef4444",
                  fontWeight: 600,
                }}
              >
                Delete
              </button>
            </>
          )}

          {/* Feature Dropdown */}
          <div style={{ position: "relative" }}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 20px",
                borderRadius: 8,
                border: "1px solid #e4dfdb",
                backgroundColor: "#fff",
                cursor: "pointer",
                fontSize: "0.95rem",
                fontWeight: 500,
              }}
            >
              {FEATURES.find((f) => f.id === activeFeature)?.icon}{" "}
              {FEATURES.find((f) => f.id === activeFeature)?.label}
              <span style={{ marginLeft: 4 }}>▼</span>
            </button>

            {dropdownOpen && (
              <div
                style={{
                  position: "absolute",
                  top: "100%",
                  right: 0,
                  marginTop: 8,
                  backgroundColor: "#fff",
                  borderRadius: 12,
                  boxShadow: "0 4px 24px rgba(0,0,0,0.15)",
                  overflow: "hidden",
                  minWidth: 200,
                  zIndex: 200,
                }}
              >
                {FEATURES.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => {
                      setActiveFeature(f.id);
                      setDropdownOpen(false);
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      width: "100%",
                      padding: "12px 20px",
                      border: "none",
                      backgroundColor: activeFeature === f.id ? "#f3f0eb" : "#fff",
                      cursor: "pointer",
                      fontSize: "0.95rem",
                      textAlign: "left",
                    }}
                  >
                    <span>{f.icon}</span>
                    <span>{f.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main style={{ padding: "32px" }}>
        {loading && <p style={{ color: "#6b7280" }}>Loading...</p>}

        {!loading && (
          <div className={styles.sections}>
            {/* 1. Vibe Panel */}
            {(activeFeature === "all" || activeFeature === "vibe") && (
              <section id="mood-vibe" className={styles.sectionCard}>
              <div className={styles.sectionHeader}>
                <div>
                  <h2 className={styles.sectionTitle}>Story Vibe</h2>
                  <p className={styles.sectionSubtitle}>Images, colors, and words that define this story.</p>
                </div>
                {moodboardId && (
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    {/* Upload vibe image */}
                    <label
                      style={{
                        padding: "6px 12px",
                        borderRadius: 999,
                        backgroundColor: uploadingVibeImage ? "#ccc" : "#e8c96e",
                        fontSize: "0.8rem",
                        fontWeight: 600,
                        cursor: uploadingVibeImage ? "default" : "pointer",
                      }}
                    >
                      {uploadingVibeImage ? "Uploading…" : "📷 Add Image"}
                      <input
                        type="file"
                        accept="image/*"
                        style={{ display: "none" }}
                        disabled={uploadingVibeImage}
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          try {
                            setUploadingVibeImage(true);
                            const uploadRes = await uploadMoodboardAsset(file, "vibe");
                            const newUrl = uploadRes.data?.url;
                            if (newUrl) {
                              const currentImages = Array.isArray(vibe?.images) ? vibe.images : [];
                              await upsertVibe(moodboardId, {
                                images: JSON.stringify([...currentImages, { url: newUrl, source: "upload" }]),
                              });
                              const res = await getVibe(moodboardId);
                              console.log("Vibe response after image upload:", res.data);
                              const panel = res.data?.panel
                                ? {
                                    ...res.data.panel,
                                    color_palette: res.data.panel.color_palette ? JSON.parse(res.data.panel.color_palette) : [],
                                    images: res.data.panel.images ? JSON.parse(res.data.panel.images) : [],
                                    themes: res.data.panel.themes ? JSON.parse(res.data.panel.themes) : [],
                                  }
                                : null;
                              console.log("Parsed vibe panel:", panel);
                              setVibe(panel);
                            }
                          } catch (err) {
                            console.error("Failed to upload vibe image:", err);
                          } finally {
                            setUploadingVibeImage(false);
                            e.target.value = "";
                          }
                        }}
                      />
                    </label>
                    {/* Add theme tag */}
                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        if (!newVibeTheme.trim()) return;
                        try {
                          setSavingVibeTheme(true);
                          const currentThemes = Array.isArray(vibe?.themes) ? vibe.themes : [];
                          await upsertVibe(moodboardId, {
                            themes: JSON.stringify([...currentThemes, newVibeTheme.trim()]),
                          });
                          setNewVibeTheme("");
                          const res = await getVibe(moodboardId);
                          console.log("Vibe response after theme add:", res.data);
                          const panel = res.data?.panel
                            ? {
                                ...res.data.panel,
                                color_palette: res.data.panel.color_palette ? JSON.parse(res.data.panel.color_palette) : [],
                                images: res.data.panel.images ? JSON.parse(res.data.panel.images) : [],
                                themes: res.data.panel.themes ? JSON.parse(res.data.panel.themes) : [],
                              }
                            : null;
                          console.log("Parsed vibe panel after theme:", panel);
                          setVibe(panel);
                        } catch (err) {
                          console.error("Failed to add theme:", err);
                        } finally {
                          setSavingVibeTheme(false);
                        }
                      }}
                      style={{ display: "flex", gap: 4 }}
                    >
                      <input
                        type="text"
                        placeholder="Add theme (e.g. dark romance)"
                        value={newVibeTheme}
                        onChange={(e) => setNewVibeTheme(e.target.value)}
                        style={{
                          padding: "6px 8px",
                          borderRadius: 999,
                          border: "1px solid #e4dfdb",
                          fontSize: "0.8rem",
                          width: 160,
                        }}
                      />
                      <button
                        type="submit"
                        disabled={savingVibeTheme || !newVibeTheme.trim()}
                        style={{
                          padding: "6px 10px",
                          borderRadius: 999,
                          border: "none",
                          backgroundColor: "#e8c96e",
                          fontSize: "0.8rem",
                          fontWeight: 600,
                          cursor: savingVibeTheme ? "default" : "pointer",
                        }}
                      >
                        {savingVibeTheme ? "…" : "+"}
                      </button>
                    </form>
                  </div>
                )}
              </div>
              <div className={styles.sectionBody}>
                {/* Pinterest-style masonry grid for vibe images */}
                <div className={styles.vibeImages}>
                  {(Array.isArray(vibe?.images) ? vibe.images : []).map((img, idx) => {
                    const imgUrl = typeof img === "string" ? img : img?.url;
                    if (!imgUrl) return null;
                    return (
                      <div key={idx} className={styles.vibeImageCard}>
                        <img
                          src={imgUrl}
                          alt={typeof img === "object" ? img?.source || "vibe" : "vibe"}
                        />
                      </div>
                    );
                  })}
                </div>
                {(Array.isArray(vibe?.images) ? vibe.images : []).length === 0 && (
                  <p className={styles.smallMuted} style={{ marginBottom: 16 }}>
                    Upload images to set the visual tone for your story.
                  </p>
                )}
                {/* Themes and summary */}
                <div className={styles.vibeWords} style={{ marginTop: 16 }}>
                  {vibe?.vibe_summary && <p style={{ marginBottom: 8 }}>{vibe.vibe_summary}</p>}
                  <div>
                    {(Array.isArray(vibe?.themes) ? vibe.themes : []).map((t, idx) => (
                      <span key={idx} className={styles.tagPill}>{t}</span>
                    ))}
                  </div>
                  {(Array.isArray(vibe?.themes) ? vibe.themes : []).length === 0 && !vibe?.vibe_summary && (
                    <p className={styles.smallMuted}>Add themes like "dark romance" or "cozy mystery"</p>
                  )}
                </div>
              </div>
            </section>
            )}

            {/* 2. Characters */}
            {(activeFeature === "all" || activeFeature === "characters") && (
            <section id="mood-characters" className={styles.sectionCard}>
              <div className={styles.sectionHeader}>
                <div>
                  <h2 className={styles.sectionTitle}>Characters</h2>
                  <p className={styles.sectionSubtitle}>The people who carry this story.</p>
                </div>
                {moodboardId && (
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    {/* Upload character image */}
                    <label
                      style={{
                        padding: "6px 12px",
                        borderRadius: 999,
                        backgroundColor: uploadingCharImage ? "#ccc" : "#e4dfdb",
                        fontSize: "0.8rem",
                        fontWeight: 600,
                        cursor: uploadingCharImage ? "default" : "pointer",
                      }}
                    >
                      {uploadingCharImage ? "Uploading…" : "📷"}
                      <input
                        type="file"
                        accept="image/*"
                        style={{ display: "none" }}
                        disabled={uploadingCharImage}
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          try {
                            setUploadingCharImage(true);
                            const uploadRes = await uploadMoodboardAsset(file, "characters");
                            const newUrl = uploadRes.data?.url;
                            if (newUrl) {
                              setNewChar((prev) => ({ ...prev, image_url: newUrl }));
                            }
                          } catch (err) {
                            console.error("Failed to upload character image:", err);
                          } finally {
                            setUploadingCharImage(false);
                            e.target.value = "";
                          }
                        }}
                      />
                    </label>
                    {newChar.image_url && (
                      <img src={newChar.image_url} alt="preview" style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover" }} />
                    )}
                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        if (!newChar.name.trim()) return;
                        try {
                          setSavingChar(true);
                          await createCharacter(moodboardId, {
                            name: newChar.name,
                            age: newChar.age || null,
                            role: newChar.role || null,
                            image_url: newChar.image_url || null,
                          });
                          setNewChar({ name: "", age: "", role: "", image_url: "" });
                          const res = await getCharacters(moodboardId);
                          setCharacters(res.data || []);
                        } catch (err) {
                          console.error("Failed to add character:", err);
                        } finally {
                          setSavingChar(false);
                        }
                      }}
                      style={{ display: "flex", gap: 6, alignItems: "center" }}
                    >
                      <input
                        type="text"
                        placeholder="New character name"
                        value={newChar.name}
                        onChange={(e) => setNewChar((prev) => ({ ...prev, name: e.target.value }))}
                        style={{
                          padding: "6px 8px",
                          borderRadius: 999,
                          border: "1px solid #e4dfdb",
                          fontSize: "0.8rem",
                        }}
                      />
                      <input
                        type="text"
                        placeholder="Age"
                        value={newChar.age}
                        onChange={(e) => setNewChar((prev) => ({ ...prev, age: e.target.value }))}
                        style={{
                          width: 60,
                          padding: "6px 8px",
                          borderRadius: 999,
                          border: "1px solid #e4dfdb",
                          fontSize: "0.8rem",
                        }}
                      />
                      <input
                        type="text"
                        placeholder="Role"
                        value={newChar.role}
                        onChange={(e) => setNewChar((prev) => ({ ...prev, role: e.target.value }))}
                        style={{
                          width: 90,
                          padding: "6px 8px",
                          borderRadius: 999,
                          border: "1px solid #e4dfdb",
                          fontSize: "0.8rem",
                        }}
                      />
                      <button
                        type="submit"
                        disabled={savingChar || !newChar.name.trim()}
                        style={{
                          padding: "6px 10px",
                          borderRadius: 999,
                          border: "none",
                          backgroundColor: "#e8c96e",
                          fontSize: "0.8rem",
                          fontWeight: 600,
                          cursor: savingChar ? "default" : "pointer",
                        }}
                      >
                        {savingChar ? "Adding…" : "+ Add"}
                      </button>
                    </form>
                  </div>
                )}
              </div>
              <div className={styles.sectionBody}>
                <div className={styles.charactersGrid}>
                  {characters.map((c) => (
                    <div key={c.id} className={styles.characterCard}>
                      <div className={styles.characterHeader}>
                        {c.image_url ? (
                          <img src={c.image_url} alt={c.name} className={styles.avatar} />
                        ) : (
                          <div className={styles.avatar} />
                        )}
                        <div>
                          <div className={styles.characterName}>{c.name}</div>
                          <div className={styles.characterMeta}>
                            {c.age && <span>{c.age}</span>}
                            {c.role && <span>{c.age ? " • " : ""}{c.role}</span>}
                          </div>
                        </div>
                      </div>

                      <div className={styles.sliderRow}>
                        <div className={styles.sliderLabel}>Introvert ↔ Extrovert</div>
                        <div className={styles.sliderTrack}>
                          <div className={styles.sliderFill} style={{ width: `${c.introvert_extrovert || 50}%` }} />
                        </div>
                      </div>

                      <div className={styles.sliderRow}>
                        <div className={styles.sliderLabel}>Soft ↔ Fierce</div>
                        <div className={styles.sliderTrack}>
                          <div className={styles.sliderFill} style={{ width: `${c.soft_fierce || 50}%` }} />
                        </div>
                      </div>

                      <div className={styles.sliderRow}>
                        <div className={styles.sliderLabel}>Chaotic ↔ Ordered</div>
                        <div className={styles.sliderTrack}>
                          <div className={styles.sliderFill} style={{ width: `${c.chaotic_ordered || 50}%` }} />
                        </div>
                      </div>

                      <div className={styles.sliderRow}>
                        <div className={styles.sliderLabel}>Logical ↔ Emotional</div>
                        <div className={styles.sliderTrack}>
                          <div className={styles.sliderFill} style={{ width: `${c.logical_emotional || 50}%` }} />
                        </div>
                      </div>

                      {c.backstory && (
                        <p className={styles.smallMuted} style={{ marginTop: 6 }}>{c.backstory}</p>
                      )}
                    </div>
                  ))}
                  {characters.length === 0 && (
                    <p className={styles.smallMuted}>No characters yet. Add some from the writer tools.</p>
                  )}
                </div>
              </div>
            </section>
            )}

            {/* 3. Plot Wall */}
            {(activeFeature === "all" || activeFeature === "plot") && (
            <section id="mood-plot" className={styles.sectionCard}>
              <div className={styles.sectionHeader}>
                <div>
                  <h2 className={styles.sectionTitle}>Plot & Scenes</h2>
                  <p className={styles.sectionSubtitle}>Sticky notes, scenes, and the act timeline.</p>
                </div>
                {moodboardId && (
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (!newNote.content.trim() && !newNote.title.trim()) return;
                      try {
                        setSavingNote(true);
                        await createNote(moodboardId, {
                          kind: newNote.kind || "idea",
                          title: newNote.title || null,
                          content: newNote.content || null,
                        });
                        setNewNote({ title: "", content: "", kind: newNote.kind || "idea" });
                        const res = await getPlotNotes(moodboardId);
                        setNotes(res.data || []);
                      } catch (err) {
                        console.error("Failed to add note:", err);
                      } finally {
                        setSavingNote(false);
                      }
                    }}
                    style={{ display: "flex", gap: 6, alignItems: "center" }}
                  >
                    <input
                      type="text"
                      placeholder="Note title"
                      value={newNote.title}
                      onChange={(e) => setNewNote((prev) => ({ ...prev, title: e.target.value }))}
                      style={{
                        padding: "6px 8px",
                        borderRadius: 999,
                        border: "1px solid #e4dfdb",
                        fontSize: "0.8rem",
                      }}
                    />
                    <input
                      type="text"
                      placeholder="Idea snippet"
                      value={newNote.content}
                      onChange={(e) => setNewNote((prev) => ({ ...prev, content: e.target.value }))}
                      style={{
                        minWidth: 160,
                        padding: "6px 8px",
                        borderRadius: 999,
                        border: "1px solid #e4dfdb",
                        fontSize: "0.8rem",
                      }}
                    />
                    <button
                      type="submit"
                      disabled={savingNote || (!newNote.title.trim() && !newNote.content.trim())}
                      style={{
                        padding: "6px 10px",
                        borderRadius: 999,
                        border: "none",
                        backgroundColor: "#e8c96e",
                        fontSize: "0.8rem",
                        fontWeight: 600,
                        cursor: savingNote ? "default" : "pointer",
                      }}
                    >
                      {savingNote ? "Adding…" : "+ Note"}
                    </button>
                  </form>
                )}
              </div>
              <div className={styles.sectionBody}>
                <div className={styles.plotGrid}>
                  <div>
                    <div className={styles.notesBoard}>
                      {notes.map((n) => (
                        <div key={n.id} className={styles.noteCard}>
                          {n.title && <div style={{ fontWeight: 600, marginBottom: 4 }}>{n.title}</div>}
                          <div>{n.content}</div>
                          {n.kind && (
                            <div style={{ marginTop: 4 }}>
                              <span className={styles.badge}>{n.kind}</span>
                            </div>
                          )}
                        </div>
                      ))}
                      {notes.length === 0 && (
                        <p className={styles.smallMuted}>No notes yet. Start dropping "what if" ideas here.</p>
                      )}
                    </div>
                    <div className={styles.timelineStrip}>
                      {timeline.map((e) => (
                        <div key={e.id} className={styles.timelineDot}>
                          {e.label}
                        </div>
                      ))}
                      {timeline.length === 0 && (
                        <span className={styles.smallMuted}>Timeline will appear here when you add events.</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className={styles.smallMuted}>
                      This area will later support drag-and-drop sticky notes and arrows between scenes.
                    </p>
                  </div>
                </div>
              </div>
            </section>
            )}

            {/* 4. World-Building */}
            {(activeFeature === "all" || activeFeature === "world") && (
            <section id="mood-world" className={styles.sectionCard}>
              <div className={styles.sectionHeader}>
                <div>
                  <h2 className={styles.sectionTitle}>World-Building</h2>
                  <p className={styles.sectionSubtitle}>Places, maps, and rules that shape the world.</p>
                </div>
                {moodboardId && (
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    {/* Upload location image first */}
                    <label
                      style={{
                        padding: "6px 12px",
                        borderRadius: 999,
                        backgroundColor: uploadingLocationImage ? "#ccc" : "#e4dfdb",
                        fontSize: "0.8rem",
                        fontWeight: 600,
                        cursor: uploadingLocationImage ? "default" : "pointer",
                      }}
                    >
                      {uploadingLocationImage ? "Uploading…" : "📷"}
                      <input
                        type="file"
                        accept="image/*"
                        style={{ display: "none" }}
                        disabled={uploadingLocationImage}
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          try {
                            setUploadingLocationImage(true);
                            const uploadRes = await uploadMoodboardAsset(file, "locations");
                            const newUrl = uploadRes.data?.url;
                            if (newUrl) {
                              setNewLocation((prev) => ({ ...prev, image_url: newUrl }));
                            }
                          } catch (err) {
                            console.error("Failed to upload location image:", err);
                          } finally {
                            setUploadingLocationImage(false);
                            e.target.value = "";
                          }
                        }}
                      />
                    </label>
                    {newLocation.image_url && (
                      <img src={newLocation.image_url} alt="preview" style={{ width: 32, height: 32, borderRadius: 8, objectFit: "cover" }} />
                    )}
                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        if (!newLocation.name.trim()) return;
                        try {
                          setSavingLocation(true);
                          await createLocation(moodboardId, {
                            name: newLocation.name,
                            kind: newLocation.kind || null,
                            notes: newLocation.notes || null,
                            image_url: newLocation.image_url || null,
                          });
                          setNewLocation({ name: "", kind: "", notes: "", image_url: "" });
                          const res = await getLocations(moodboardId);
                          setLocations(res.data || []);
                        } catch (err) {
                          console.error("Failed to add location:", err);
                        } finally {
                          setSavingLocation(false);
                        }
                      }}
                      style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}
                    >
                      <input
                        type="text"
                        placeholder="Location name"
                        value={newLocation.name}
                        onChange={(e) => setNewLocation((prev) => ({ ...prev, name: e.target.value }))}
                        style={{
                          padding: "6px 8px",
                          borderRadius: 999,
                          border: "1px solid #e4dfdb",
                          fontSize: "0.8rem",
                        }}
                      />
                      <input
                        type="text"
                        placeholder="Type (city, room…)"
                        value={newLocation.kind}
                        onChange={(e) => setNewLocation((prev) => ({ ...prev, kind: e.target.value }))}
                        style={{
                          width: 100,
                          padding: "6px 8px",
                          borderRadius: 999,
                          border: "1px solid #e4dfdb",
                          fontSize: "0.8rem",
                        }}
                      />
                      <button
                        type="submit"
                        disabled={savingLocation || !newLocation.name.trim()}
                        style={{
                          padding: "6px 10px",
                          borderRadius: 999,
                          border: "none",
                          backgroundColor: "#e8c96e",
                          fontSize: "0.8rem",
                          fontWeight: 600,
                          cursor: savingLocation ? "default" : "pointer",
                        }}
                      >
                        {savingLocation ? "Adding…" : "+ Location"}
                      </button>
                    </form>
                  </div>
                )}
              </div>
              <div className={styles.sectionBody}>
                <div className={styles.plotGrid}>
                  <div>
                    <div className={styles.locationsGrid}>
                      {locations.map((loc) => (
                        <div key={loc.id} className={styles.locationCard}>
                          {loc.image_url && (
                            <img src={loc.image_url} alt={loc.name} className={styles.locationImage} />
                          )}
                          <div className={styles.locationTitle}>{loc.name}</div>
                          {loc.kind && <div className={styles.smallMuted}>{loc.kind}</div>}
                          {loc.notes && <div className={styles.locationText}>{loc.notes}</div>}
                        </div>
                      ))}
                      {locations.length === 0 && (
                        <p className={styles.smallMuted}>Add key locations to visualize your world.</p>
                      )}
                    </div>
                  </div>
                  <div>
                    <div className={styles.metaList}>
                      <div>
                        <div className={styles.metaItemTitle}>Magic & Rules</div>
                        <div>{worldMeta?.magic_rules || "Define the limits of power and what it costs."}</div>
                      </div>
                      <div>
                        <div className={styles.metaItemTitle}>Politics & Society</div>
                        <div>{worldMeta?.politics || worldMeta?.society || "Who holds power? Who is left out?"}</div>
                      </div>
                      <div>
                        <div className={styles.metaItemTitle}>Culture, Food, Clothing</div>
                        <div>
                          {worldMeta?.culture_food || worldMeta?.clothing ||
                            "What do they eat, wear, and celebrate?"}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>
            )}

            {/* 5. Dialogue & Quotes */}
            {(activeFeature === "all" || activeFeature === "quotes") && (
            <section id="mood-quotes" className={styles.sectionCard}>
              <div className={styles.sectionHeader}>
                <div>
                  <h2 className={styles.sectionTitle}>Dialogue & Quotes</h2>
                  <p className={styles.sectionSubtitle}>Lines that hit at 2am.</p>
                </div>
                {moodboardId && (
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (!newQuote.text.trim()) return;
                      try {
                        setSavingQuote(true);
                        await createQuote(moodboardId, {
                          text: newQuote.text,
                          speaker: newQuote.speaker || null,
                          tone: newQuote.tone || null,
                        });
                        setNewQuote({ text: "", speaker: "", tone: "" });
                        const res = await getQuotes(moodboardId);
                        setQuotes(res.data || []);
                      } catch (err) {
                        console.error("Failed to add quote:", err);
                      } finally {
                        setSavingQuote(false);
                      }
                    }}
                    style={{ display: "flex", gap: 6, alignItems: "center" }}
                  >
                    <input
                      type="text"
                      placeholder="Save a line…"
                      value={newQuote.text}
                      onChange={(e) => setNewQuote((prev) => ({ ...prev, text: e.target.value }))}
                      style={{
                        minWidth: 180,
                        padding: "6px 8px",
                        borderRadius: 999,
                        border: "1px solid #e4dfdb",
                        fontSize: "0.8rem",
                      }}
                    />
                    <input
                      type="text"
                      placeholder="Speaker"
                      value={newQuote.speaker}
                      onChange={(e) => setNewQuote((prev) => ({ ...prev, speaker: e.target.value }))}
                      style={{
                        width: 90,
                        padding: "6px 8px",
                        borderRadius: 999,
                        border: "1px solid #e4dfdb",
                        fontSize: "0.8rem",
                      }}
                    />
                    <input
                      type="text"
                      placeholder="Tone (angry, soft…)"
                      value={newQuote.tone}
                      onChange={(e) => setNewQuote((prev) => ({ ...prev, tone: e.target.value }))}
                      style={{
                        width: 120,
                        padding: "6px 8px",
                        borderRadius: 999,
                        border: "1px solid #e4dfdb",
                        fontSize: "0.8rem",
                      }}
                    />
                    <button
                      type="submit"
                      disabled={savingQuote || !newQuote.text.trim()}
                      style={{
                        padding: "6px 10px",
                        borderRadius: 999,
                        border: "none",
                        backgroundColor: "#e8c96e",
                        fontSize: "0.8rem",
                        fontWeight: 600,
                        cursor: savingQuote ? "default" : "pointer",
                      }}
                    >
                      {savingQuote ? "Saving…" : "+ Line"}
                    </button>
                  </form>
                )}
              </div>
              <div className={styles.sectionBody}>
                <div className={styles.quotesStrip}>
                  {quotes.map((q) => (
                    <div key={q.id} className={styles.quoteBubble}>
                      <div style={{ marginBottom: 4 }}>“{q.text}”</div>
                      <div className={styles.smallMuted}>
                        {q.speaker && <span>{q.speaker}</span>}
                        {q.tone && <span>{q.speaker ? " • " : ""}{q.tone}</span>}
                      </div>
                    </div>
                  ))}
                  {quotes.length === 0 && (
                    <p className={styles.smallMuted}>Save sharp lines and monologues here.</p>
                  )}
                </div>
              </div>
            </section>
            )}

            {/* 6. Inspiration Library */}
            {(activeFeature === "all" || activeFeature === "inspiration") && (
            <section id="mood-inspiration" className={styles.sectionCard}>
              <div className={styles.sectionHeader}>
                <div>
                  <h2 className={styles.sectionTitle}>Inspiration Library</h2>
                  <p className={styles.sectionSubtitle}>Images, prompts, and sparks.</p>
                </div>
                {moodboardId && (
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    {/* Upload inspiration image */}
                    <label
                      style={{
                        padding: "6px 12px",
                        borderRadius: 999,
                        backgroundColor: uploadingInspiration ? "#ccc" : "#e8c96e",
                        fontSize: "0.8rem",
                        fontWeight: 600,
                        cursor: uploadingInspiration ? "default" : "pointer",
                      }}
                    >
                      {uploadingInspiration ? "Uploading…" : "📷 Upload Image"}
                      <input
                        type="file"
                        accept="image/*"
                        style={{ display: "none" }}
                        disabled={uploadingInspiration}
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          try {
                            setUploadingInspiration(true);
                            const uploadRes = await uploadMoodboardAsset(file, "inspiration");
                            const newUrl = uploadRes.data?.url;
                            if (newUrl) {
                              await createInspiration(moodboardId, {
                                type: "image",
                                title: file.name,
                                url: newUrl,
                              });
                              const res = await getInspirations(moodboardId);
                              setInspirations(res.data || []);
                            }
                          } catch (err) {
                            console.error("Failed to upload inspiration:", err);
                          } finally {
                            setUploadingInspiration(false);
                            e.target.value = "";
                          }
                        }}
                      />
                    </label>
                    {/* Add URL inspiration */}
                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        if (!newInspiration.url.trim()) return;
                        try {
                          setSavingInspiration(true);
                          await createInspiration(moodboardId, {
                            type: newInspiration.type || "image",
                            title: newInspiration.title || null,
                            url: newInspiration.url,
                          });
                          setNewInspiration({ type: "image", title: "", url: "" });
                          const res = await getInspirations(moodboardId);
                          setInspirations(res.data || []);
                        } catch (err) {
                          console.error("Failed to add inspiration:", err);
                        } finally {
                          setSavingInspiration(false);
                        }
                      }}
                      style={{ display: "flex", gap: 4, alignItems: "center" }}
                    >
                      <select
                        value={newInspiration.type}
                        onChange={(e) => setNewInspiration((prev) => ({ ...prev, type: e.target.value }))}
                        style={{
                          padding: "6px 8px",
                          borderRadius: 999,
                          border: "1px solid #e4dfdb",
                          fontSize: "0.8rem",
                        }}
                      >
                        <option value="image">Image URL</option>
                        <option value="pinterest">Pinterest</option>
                        <option value="video">Video</option>
                        <option value="tiktok">TikTok</option>
                        <option value="quote">Quote</option>
                      </select>
                      <input
                        type="text"
                        placeholder="Paste URL…"
                        value={newInspiration.url}
                        onChange={(e) => setNewInspiration((prev) => ({ ...prev, url: e.target.value }))}
                        style={{
                          padding: "6px 8px",
                          borderRadius: 999,
                          border: "1px solid #e4dfdb",
                          fontSize: "0.8rem",
                          minWidth: 180,
                        }}
                      />
                      <button
                        type="submit"
                        disabled={savingInspiration || !newInspiration.url.trim()}
                        style={{
                          padding: "6px 10px",
                          borderRadius: 999,
                          border: "none",
                          backgroundColor: "#e8c96e",
                          fontSize: "0.8rem",
                          fontWeight: 600,
                          cursor: savingInspiration ? "default" : "pointer",
                        }}
                      >
                        {savingInspiration ? "…" : "+ Add"}
                      </button>
                    </form>
                  </div>
                )}
              </div>
              <div className={styles.sectionBody}>
                <div className={styles.inspirationGrid}>
                  {inspirations.map((i) => (
                    <div key={i.id} className={styles.inspirationCard} style={{ position: "relative" }}>
                      {i.url && i.type === "image" ? (
                        <img
                          src={i.url}
                          alt={i.title || i.type}
                        />
                      ) : i.url ? (
                        <a
                          href={i.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            minHeight: 100,
                            padding: 16,
                            textDecoration: "none",
                            color: "#111",
                            backgroundColor: "#f8f5f2",
                          }}
                        >
                          <span style={{ fontSize: "2rem", marginBottom: 8 }}>
                            {i.type === "pinterest" ? "📌" : i.type === "tiktok" ? "🎵" : i.type === "video" ? "🎬" : "🔗"}
                          </span>
                          <span style={{ fontSize: "0.8rem", textAlign: "center", fontWeight: 500 }}>{i.title || i.type}</span>
                          <span style={{ fontSize: "0.7rem", color: "#666", marginTop: 6 }}>Click to open →</span>
                        </a>
                      ) : null}
                      {i.title && i.type === "image" && (
                        <div
                          style={{
                            position: "absolute",
                            bottom: 0,
                            left: 0,
                            right: 0,
                            padding: "6px 8px",
                            backgroundColor: "rgba(0,0,0,0.6)",
                            color: "#fff",
                            fontSize: "0.75rem",
                          }}
                        >
                          {i.title}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                {inspirations.length === 0 && (
                  <p className={styles.smallMuted}>Pin your references, prompts, and aesthetics here.</p>
                )}
              </div>
            </section>
            )}

            {/* 7. Soundtrack */}
            {(activeFeature === "all" || activeFeature === "soundtrack") && (
            <section id="mood-soundtrack" className={styles.sectionCard}>
              <div className={styles.sectionHeader}>
                <div>
                  <h2 className={styles.sectionTitle}>Soundtrack</h2>
                  <p className={styles.sectionSubtitle}>Playlists, tracks, and ambient sounds.</p>
                </div>
                {moodboardId && (
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (!newTrack.label.trim() && !newTrack.spotify_url.trim()) return;
                      try {
                        setSavingTrack(true);
                        await createTrack(moodboardId, {
                          kind: newTrack.kind || "spotify_playlist",
                          label: newTrack.label || null,
                          spotify_url: newTrack.spotify_url || null,
                          scene_label: newTrack.scene_label || null,
                        });
                        setNewTrack({ kind: "spotify_playlist", label: "", spotify_url: "", scene_label: "" });
                        const res = await getTracks(moodboardId);
                        setTracks(res.data || []);
                      } catch (err) {
                        console.error("Failed to add track:", err);
                      } finally {
                        setSavingTrack(false);
                      }
                    }}
                    style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}
                  >
                    <select
                      value={newTrack.kind}
                      onChange={(e) => setNewTrack((prev) => ({ ...prev, kind: e.target.value }))}
                      style={{
                        padding: "6px 8px",
                        borderRadius: 999,
                        border: "1px solid #e4dfdb",
                        fontSize: "0.8rem",
                      }}
                    >
                      <option value="spotify_playlist">Spotify Playlist</option>
                      <option value="spotify_track">Spotify Track</option>
                      <option value="ambient">Ambient Sound</option>
                      <option value="youtube">YouTube</option>
                    </select>
                    <input
                      type="text"
                      placeholder="Label (e.g. Rainy Day Vibes)"
                      value={newTrack.label}
                      onChange={(e) => setNewTrack((prev) => ({ ...prev, label: e.target.value }))}
                      style={{
                        padding: "6px 8px",
                        borderRadius: 999,
                        border: "1px solid #e4dfdb",
                        fontSize: "0.8rem",
                        minWidth: 140,
                      }}
                    />
                    <input
                      type="text"
                      placeholder="Paste Spotify/YouTube URL…"
                      value={newTrack.spotify_url}
                      onChange={(e) => setNewTrack((prev) => ({ ...prev, spotify_url: e.target.value }))}
                      style={{
                        padding: "6px 8px",
                        borderRadius: 999,
                        border: "1px solid #e4dfdb",
                        fontSize: "0.8rem",
                        minWidth: 200,
                      }}
                    />
                    <input
                      type="text"
                      placeholder="Scene (optional)"
                      value={newTrack.scene_label}
                      onChange={(e) => setNewTrack((prev) => ({ ...prev, scene_label: e.target.value }))}
                      style={{
                        padding: "6px 8px",
                        borderRadius: 999,
                        border: "1px solid #e4dfdb",
                        fontSize: "0.8rem",
                        width: 100,
                      }}
                    />
                    <button
                      type="submit"
                      disabled={savingTrack || (!newTrack.label.trim() && !newTrack.spotify_url.trim())}
                      style={{
                        padding: "6px 10px",
                        borderRadius: 999,
                        border: "none",
                        backgroundColor: "#e8c96e",
                        fontSize: "0.8rem",
                        fontWeight: 600,
                        cursor: savingTrack ? "default" : "pointer",
                      }}
                    >
                      {savingTrack ? "Adding…" : "+ Track"}
                    </button>
                  </form>
                )}
              </div>
              <div className={styles.sectionBody}>
                <div className={styles.soundtrackStrip}>
                  {tracks.map((t) => (
                    <div key={t.id} className={styles.trackCard}>
                      {t.spotify_url ? (
                        <a
                          href={t.spotify_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: "inherit", textDecoration: "none" }}
                        >
                          <div style={{ fontWeight: 600 }}>{t.label || t.kind} 🔗</div>
                        </a>
                      ) : (
                        <div>{t.label || t.kind}</div>
                      )}
                      {t.scene_label && <div className={styles.smallMuted}>Scene: {t.scene_label}</div>}
                      {t.spotify_url && (
                        <a
                          href={t.spotify_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ fontSize: "0.75rem", color: "#1DB954", marginTop: 4, display: "block" }}
                        >
                          Open in {t.kind === "youtube" ? "YouTube" : "Spotify"} →
                        </a>
                      )}
                    </div>
                  ))}
                  {tracks.length === 0 && (
                    <p className={styles.smallMuted}>Attach playlists or ambient sounds that match your scenes.</p>
                  )}
                </div>
              </div>
            </section>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

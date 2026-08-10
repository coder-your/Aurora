import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getLibrary, removeFromTBR, updateLibraryStatus, clearLibraryEntry } from "../services/libraryApi";
import styles from "../styles/myLibrary.module.css";

export default function MyLibrary() {
  const [data, setData] = useState({ tbr: [], current: [], finished: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchLibrary = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await getLibrary();
        setData(res.data || { tbr: [], current: [], finished: [] });
      } catch (err) {
        console.error("Failed to load library", err);
        setError("Failed to load your library.");
      } finally {
        setLoading(false);
      }
    };

    fetchLibrary();
  }, []);

  const handleOpenStoryDetail = (storyId) => {
    navigate(`/story/${storyId}`);
  };

  const handleResumeReading = (storyId) => {
    navigate(`/read/${storyId}`);
  };

  const refreshLibrary = async () => {
    try {
      const res = await getLibrary();
      setData(res.data || { tbr: [], current: [], finished: [] });
    } catch (err) {
      console.error("Failed to reload library", err);
    }
  };

  const handleStatusChange = async (storyId, target) => {
    try {
      await updateLibraryStatus(storyId, target);
      await refreshLibrary();
    } catch (err) {
      console.error("Failed to update status", err);
    }
  };

  const handleClearEntry = async (storyId) => {
    try {
      await clearLibraryEntry(storyId);
      await refreshLibrary();
    } catch (err) {
      console.error("Failed to clear library entry", err);
    }
  };

  const handleRemoveFromTBR = async (storyId) => {
    try {
      await removeFromTBR(storyId);
      await refreshLibrary();
    } catch (err) {
      console.error("Failed to remove from TBR", err);
    }
  };

  const renderSection = (title, items, emptyText, options = {}) => (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>{title}</h2>
      {items.length === 0 ? (
        <p className={styles.emptyText}>{emptyText}</p>
      ) : (
        <div className={styles.grid}>
          {items.map((item) => (
            <div key={item.story_id} className={styles.cardWrapper}>
              <button
                className={styles.card}
                onClick={() => handleOpenStoryDetail(item.story_id)}
              >
              <div className={styles.coverWrapper}>
                {item.cover_url ? (
                  <img
                    src={item.cover_url}
                    alt={item.title}
                    className={styles.cover}
                  />
                ) : (
                  <div className={styles.coverPlaceholder}>📖</div>
                )}
              </div>
              <div className={styles.cardBody}>
                <h3 className={styles.title}>{item.title || "Untitled"}</h3>
                <div className={styles.metaRow}>
                  <span className={styles.meta}>
                    {item.total_chapters || 0} chapters
                  </span>
                  <span className={styles.meta}>
                    {Math.round(item.progress || 0)}%
                  </span>
                </div>
                {item.bookmarks_count > 0 && (
                  <div className={styles.metaBookmarks}>
                    {item.bookmarks_count} bookmark
                    {item.bookmarks_count > 1 ? "s" : ""}
                  </div>
                )}
              </div>
              </button>

              {/* Three-dots menu */}
              <div className={styles.menuWrapper}>
                <details className={styles.menuDetails}>
                  <summary className={styles.menuButton}>⋮</summary>
                  <div className={styles.menuDropdown} onClick={(e) => e.stopPropagation()}>
                    {options.section === "tbr" && (
                      <>
                        <button
                          className={styles.menuItem}
                          onClick={() => handleResumeReading(item.story_id)}
                        >
                          Start Reading
                        </button>
                        <button
                          className={styles.menuItem}
                          onClick={() => handleStatusChange(item.story_id, "current")}
                        >
                          Add to Current
                        </button>
                        <button
                          className={styles.menuItem}
                          onClick={() => handleStatusChange(item.story_id, "finished")}
                        >
                          Add to Finished
                        </button>
                        <button
                          className={styles.menuItem}
                          onClick={() => handleRemoveFromTBR(item.story_id)}
                        >
                          Remove
                        </button>
                      </>
                    )}
                    {options.section === "current" && (
                      <>
                        <button
                          className={styles.menuItem}
                          onClick={() => handleResumeReading(item.story_id)}
                        >
                          Resume Reading
                        </button>
                        <button
                          className={styles.menuItem}
                          onClick={() => handleStatusChange(item.story_id, "tbr")}
                        >
                          Add to To Be Read
                        </button>
                        <button
                          className={styles.menuItem}
                          onClick={() => handleStatusChange(item.story_id, "finished")}
                        >
                          Add to Finished
                        </button>
                        <button
                          className={styles.menuItem}
                          onClick={() => handleClearEntry(item.story_id)}
                        >
                          Remove
                        </button>
                      </>
                    )}
                    {options.section === "finished" && (
                      <>
                        <button
                          className={styles.menuItem}
                          onClick={() => handleResumeReading(item.story_id)}
                        >
                          Read Again
                        </button>
                        <button
                          className={styles.menuItem}
                          onClick={() => handleStatusChange(item.story_id, "tbr")}
                        >
                          Add to To Be Read
                        </button>
                        <button
                          className={styles.menuItem}
                          onClick={() => handleStatusChange(item.story_id, "current")}
                        >
                          Add to Current
                        </button>
                        <button
                          className={styles.menuItem}
                          onClick={() => handleClearEntry(item.story_id)}
                        >
                          Remove
                        </button>
                      </>
                    )}
                  </div>
                </details>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loadingContainer}>
          <div className={styles.spinner}></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.page}>
        <p className={styles.errorText}>{error}</p>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.pageTitle}>My Library</h1>
      </header>
      {renderSection("To Be Read", data.tbr, "No books in your TBR yet.", {
        section: "tbr",
      })}
      {renderSection("Current Reads", data.current, "You have no current reads.", {
        section: "current",
      })}
      {renderSection("Finished", data.finished, "You haven't finished any books yet.", {
        section: "finished",
      })}
    </div>
  );
}

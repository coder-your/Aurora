import React, { useState, useEffect } from "react";
import { getWriterDashboard, deleteBook, restoreBook, updateBookMetadata, uploadBookCover, upsertWritingProgress } from "../services/bookService";

import { CATEGORIES, TAGS } from "../constants";
import { createMoodboard, getMyMoodboards } from "../services/moodboardService";




import BookCard from "../components/BookCard";
import { useNavigate, useLocation } from "react-router-dom";
import styles from "../styles/writerDashboard.module.css";

export default function WriterDashboard() {

  const [books, setBooks] = useState([]);
  const [showLogForm, setShowLogForm] = useState(false);
  const [logSaving, setLogSaving] = useState(false);
  const [logForm, setLogForm] = useState({
    story_id: "",
    wordCount: "",
    timeSpentMinutes: 10,
    moodNotes: "",
  });
  const [streak, setStreak] = useState({ days: 3 });
  const [toast, setToast] = useState(null);

  const [editingBook, setEditingBook] = useState(null);
  const [editForm, setEditForm] = useState({ title: "", description: "", category: "", tags: "" });
  const [saving, setSaving] = useState(false);
  
  // Sorting & Filtering
  const [sortBy, setSortBy] = useState("newest");
  const [filterCategory, setFilterCategory] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  
  const navigate = useNavigate();

  const location = useLocation();

  const fetchBooks = async () => {
    try {
      const data = await getWriterDashboard();

      // Combine books from backend categories
      const allBooks = [
        ...(data.drafts || []),
        ...(data.in_progress || []),
        ...(data.published || [])
      ];

      const enrichedBooks = allBooks.map((b) => ({
        ...b,
        total_chapters: b.total_chapters || 0,
        completed_chapters: b.completed_chapters || 0,
      }));

      // DEBUG: Log books and their categories
      console.log("All books with categories:", enrichedBooks.map(b => ({ title: b.title, category: b.category })));

      setBooks(enrichedBooks);
    } catch (err) {
      console.error("Failed to fetch books:", err);
    }
  };

  useEffect(() => { fetchBooks(); }, []);

  // Refresh on navigate with state
  useEffect(() => {
    if (location.state?.refresh) fetchBooks();
  }, [location.state]);

  // LIVE book status updates
  useEffect(() => {
    const handleStatusChange = (e) => {
      const { story_id, status } = e.detail;

      setBooks(prevBooks => 
        prevBooks.map(b => b.story_id === story_id ? { ...b, status } : b)
      );
    };

    window.addEventListener("book-status-changed", handleStatusChange);
    return () => window.removeEventListener("book-status-changed", handleStatusChange);
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this book?")) return;
    try {
      await deleteBook(id);
      fetchBooks();
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  const handleRestore = async (id) => {
    try {
      await restoreBook(id);
      fetchBooks();
    } catch (err) {
      console.error("Restore failed:", err);
    }
  };

  const handleEdit = (id) => {
    navigate(`/books/${id}/chapters`);
  };

  const handleOpenMoodboard = (book) => {
    (async () => {
      try {
        const mineRes = await getMyMoodboards(book.story_id);
        const boards = Array.isArray(mineRes.data) ? mineRes.data : [];

        const existing = boards.find((b) => Number(b.story_id) === Number(book.story_id));
        if (existing?.moodboard_id) {
          navigate("/mood-board", {
            state: {
              moodboardId: existing.moodboard_id,
            },
          });
          return;
        }

        const created = await createMoodboard({
          title: `${book.title || "Untitled"} Moodboard`,
          description: null,
          visibility: "private",
          story_id: book.story_id,
        });

        navigate("/mood-board", {
          state: {
            moodboardId: created.data?.moodboard_id,
          },
        });
      } catch (err) {
        console.error("Failed to open connected moodboard:", err);
        navigate("/mood-board", {
          state: {
            storyId: book.story_id,
            storyTitle: book.title,
          },
        });
      }
    })();
  };

  const handleEditDetails = (book) => {
    setEditingBook(book);

    // Parse tags - could be array, comma-separated string, or empty
    let tagsArray = [];
    if (Array.isArray(book.tags)) {
      tagsArray = book.tags;
    } else if (typeof book.tags === "string" && book.tags) {
      tagsArray = book.tags.split(",").map(t => t.trim()).filter(Boolean);
    }

    setEditForm({
      title: book.title || "",
      description: book.description || "",
      category: book.category || "",
      tags: tagsArray,
    });
  };

  const handleTagToggle = (tag) => {
    setEditForm(prev => {
      const currentTags = Array.isArray(prev.tags) ? prev.tags : [];
      if (currentTags.includes(tag)) {
        return { ...prev, tags: currentTags.filter(t => t !== tag) };
      } else {
        return { ...prev, tags: [...currentTags, tag] };
      }
    });
  };

  const handleEditFieldChange = (e) => {
    const { name, value } = e.target;
    setEditForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveDetails = async () => {
    if (!editingBook) return;
    setSaving(true);
    try {
      const payload = {
        title: editForm.title,
        description: editForm.description,
        category: editForm.category,  // Always send category (even if empty string)
        tags: Array.isArray(editForm.tags) && editForm.tags.length > 0 
          ? editForm.tags 
          : undefined,
      };
      
      console.log("Saving payload:", payload);  // DEBUG

      await updateBookMetadata(editingBook.story_id, payload);
      await fetchBooks();
      setEditingBook(null);
    } catch (err) {
      console.error("Update metadata failed:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleCoverChange = async (e) => {
    if (!editingBook) return;
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await uploadBookCover(editingBook.story_id, file);
      await fetchBooks();
    } catch (err) {
      console.error("Cover upload failed:", err);
    }
  };

  // Sort function
  const sortBooks = (bookList) => {
    const sorted = [...bookList];
    switch (sortBy) {
      case "title-asc":
        return sorted.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
      case "title-desc":
        return sorted.sort((a, b) => (b.title || "").localeCompare(a.title || ""));
      case "newest":
        return sorted.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
      case "oldest":
        return sorted.sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0));
      case "most-chapters":
        return sorted.sort((a, b) => (b.total_chapters || 0) - (a.total_chapters || 0));
      case "recently-updated":
        return sorted.sort((a, b) => new Date(b.updated_at || 0) - new Date(a.updated_at || 0));
      default:
        return sorted;
    }
  };

  // Filter function
  const filterBooks = (bookList) => {
    // DEBUG: Log when filter is applied
    if (filterCategory) {
      console.log("Filtering by category:", filterCategory);
      console.log("Books being filtered:", bookList.map(b => ({ title: b.title, category: b.category })));
    }
    
    return bookList.filter(book => {
      // Search filter
      const matchesSearch = !searchQuery || 
        (book.title || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (book.description || "").toLowerCase().includes(searchQuery.toLowerCase());
      
      // Category filter - trim and compare case-insensitively for safety
      const bookCategory = (book.category || "").trim().toLowerCase();
      const selectedCategory = filterCategory.trim().toLowerCase();
      const matchesCategory = !filterCategory || bookCategory === selectedCategory;
      
      // DEBUG: Log each comparison
      if (filterCategory) {
        console.log(`Book "${book.title}": category="${book.category}" vs filter="${filterCategory}" => match=${matchesCategory}`);
      }
      
      return matchesSearch && matchesCategory;
    });
  };

  // Apply filters and sorting
  const processBooks = (bookList) => sortBooks(filterBooks(bookList));

  // Categorize and process books
  const drafts = processBooks(books.filter((b) => b.status === "draft"));
  const inProgress = processBooks(books.filter((b) => b.status === "in_progress"));
  const published = processBooks(books.filter((b) => b.status === "published"));

  // Get unique categories from user's books for filter dropdown
  const usedCategories = [...new Set(books.map((b) => b.category).filter(Boolean))];

  const [activeSidebar, setActiveSidebar] = useState("drafts");

  const PinEmptySlot = ({ prompt }) => (
    <div className={styles["pin-empty"]}>
      <div className={styles["pin-plus"]}>+$+</div>
      <div className={styles["pin-prompt"]}>{prompt}</div>
    </div>
  );

  return (
    <div className={styles.dashboard}>
      <div className={styles["sanctuary-layout"]}>
        {/* Left Sidebar (Anchor) */}
        <aside className={styles["left-sidebar"]}>
          <div className={styles["sidebar-header-card"]}>
            <div className={styles["sidebar-brand"]}>✍️ Author Sanctuary</div>
            <div className={styles["sidebar-sub"]}>Your workspace anchor</div>
          </div>

          <nav className={styles["sidebar-nav"]}>
            <button
              type="button"
              className={`${styles["sidebar-item"]} ${activeSidebar === "drafts" ? styles["sidebar-item-active"] : ""}`}
              onClick={() => setActiveSidebar("drafts")}
            >
              <span className={styles["sidebar-emoji"]}>📚</span>
              <span>Drafts</span>
            </button>

            <button
              type="button"
              className={`${styles["sidebar-item"]} ${activeSidebar === "moodboards" ? styles["sidebar-item-active"] : ""}`}
              onClick={() => navigate("/mood-board")}
            >
              <span className={styles["sidebar-emoji"]}>🖼️</span>
              <span>Inspiration Boards</span>
            </button>

            <button
              type="button"
              className={`${styles["sidebar-item"]} ${activeSidebar === "plot-twists" ? styles["sidebar-item-active"] : ""}`}
              onClick={() => navigate("/writer/plot-twists")}
            >
              <span className={styles["sidebar-emoji"]}>🔀</span>
              <span>Plot Twists</span>
            </button>
          </nav>

        </aside>



        {/* Main Canvas (Center) */}
        <main className={styles["main-canvas"]}>
          {/* Hero banner */}
          <div className={styles["create-hero"]}>
            <div className={styles["create-hero-inner"]}>
              <div className={styles["create-hero-text"]}>
                <div className={styles["create-hero-eyebrow"]}>Start a New Story</div>
                <div className={styles["create-hero-title"]}>Pull a fresh journal from the shelf.</div>
                <div className={styles["create-hero-sub"]}>Create a manuscript, then log your progress as you write.</div>
              </div>

              <div className={styles["create-hero-actions"]}>
                <button
                  className={styles["hero-primary"]}
                  onClick={() => navigate("/books/create")}
                >
                  Create New Book
                </button>

                <div className={styles["hero-secondary-row"]}>
                  <button
                    type="button"
                    className={styles["hero-secondary"]}
                    onClick={() => {
                      // Scaffold: route users into a writing action area.
                      // Prefer a sensible default: go to drafts editor if available, else create.
                      if (drafts[0]?.story_id) navigate(`/books/${drafts[0].story_id}/chapters`);
                      else navigate("/books/create");
                    }}
                  >
                    Log Today’s Progress
                  </button>

                  <button
                    type="button"
                    className={styles["hero-secondary"]}
                    onClick={() => navigate("/writer/plot-twists")}
                  >
                    Plot Twists 🔀
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Filters & Sorting Bar */}
          <div className={styles["filters-bar"]}>
            <div className={styles["filters-search"]}>
              <input
                type="text"
                placeholder="🔍 Search books..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={styles["filters-search-input"]}
              />
            </div>

            <div className={styles["filters-sort"]}>
              <label className={styles["filters-label"]}>Sort:</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className={styles["filters-select"]}
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="title-asc">Title A → Z</option>
                <option value="title-desc">Title Z → A</option>
                <option value="most-chapters">Most Chapters</option>
                <option value="recently-updated">Recently Updated</option>
              </select>
            </div>

            <div className={styles["filters-sort"]}>
              <label className={styles["filters-label"]}>Category:</label>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className={styles["filters-select"]}
              >
                <option value="">All Categories</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {(searchQuery || filterCategory || sortBy !== "newest") && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setFilterCategory("");
                  setSortBy("newest");
                }}
                className={styles["filters-clear-btn"]}
              >
                ✕ Clear
              </button>
            )}

            <div className={styles["filters-count"]}>
              {drafts.length + inProgress.length + published.length} of {books.length} book{books.length !== 1 ? "s" : ""}
            </div>
          </div>

          {filterCategory && drafts.length + inProgress.length + published.length === 0 && (
            <div className={styles["no-results-box"]}>
              <p className={styles["no-results-title"]}>
                No books found in category "<strong>{filterCategory}</strong>"
              </p>
              <p className={styles["no-results-text"]}>
                Your books have these categories: {usedCategories.length > 0 ? usedCategories.join(", ") : "None assigned yet"}
              </p>
              <button
                onClick={() => setFilterCategory("")}
                className={styles["no-results-button"]}
              >
                Show All Books
              </button>
            </div>
          )}

          {/* Main content sections */}
          <div className={styles["canvas-grid"]}>
            <section className={styles["bookshelf-col"]}>
              {activeSidebar !== "moodboards" && (
                <>
                  <section className={styles["dashboard-section"]}>
                    <h2 className={styles["section-title"]}>Drafts</h2>
                    <div className={styles["bookshelf-grid"]}>
                      {drafts.length ? (
                        drafts.map((b) => (
                          <BookCard
                            key={b.story_id}
                            book={b}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                            onRestore={handleRestore}
                            onEditDetails={handleEditDetails}
                            onOpenMoodboard={handleOpenMoodboard}
                            className={styles["book-item"]}
                          />
                        ))
                      ) : (
                        <PinEmptySlot prompt="Create a new draft manuscript…" />
                      )}
                    </div>
                  </section>

                  <section className={styles["dashboard-section"]}>
                    <h2 className={styles["section-title"]}>In Progress</h2>
                    <div className={styles["bookshelf-grid"]}>
                      {inProgress.length ? (
                        inProgress.map((b) => (
                          <BookCard
                            key={b.story_id}
                            book={b}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                            onRestore={handleRestore}
                            onEditDetails={handleEditDetails}
                            onOpenMoodboard={handleOpenMoodboard}
                            className={styles["book-item"]}
                          />
                        ))
                      ) : (
                        <PinEmptySlot prompt="Pin your next chapter idea here…" />
                      )}
                    </div>
                  </section>

                  <section className={styles["dashboard-section"]}>
                    <h2 className={styles["section-title"]}>Published / Completed</h2>
                    <div className={styles["bookshelf-grid"]}>
                      {published.length ? (
                        published.map((b) => (
                          <BookCard
                            key={b.story_id}
                            book={b}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                            onRestore={handleRestore}
                            onEditDetails={handleEditDetails}
                            onOpenMoodboard={handleOpenMoodboard}
                            className={styles["book-item"]}
                          />
                        ))
                      ) : (
                        <PinEmptySlot prompt="Your finished shelf is waiting…" />
                      )}
                    </div>
                  </section>
                </>
              )}

              {activeSidebar === "moodboards" && (
                <section className={styles["dashboard-section"]}>
                  <h2 className={styles["section-title"]}>Inspiration & Outline Board</h2>
                  <div className={styles["outline-board"]}>
                    <div className={styles["outline-masonry"]}>
                      {/* Scaffold pins */}
                      {new Array(9).fill(0).map((_, idx) => (
                        <div key={idx} className={styles["outline-pin"]}>
                          <div className={styles["outline-pin-art"]}>🎴</div>
                          <div className={styles["outline-pin-text"]}>Pin #{idx + 1}</div>
                        </div>
                      ))}
                    </div>
                    <div className={styles["outline-side"]}>
                      <div className={styles["daily-goal-card"]}>
                        <div className={styles["daily-goal-top"]}>
                          <div className={styles["daily-goal-title"]}>Daily Writing Goal</div>
                          <div className={styles["streak-badge"]}>
                            <span className={styles["streak-badge-emoji"]}>🔥</span> {streak.days}-day streak
                          </div>
                        </div>
                        <div className={styles["daily-progress-label"]}>Progress</div>
                        <div className={styles["daily-track"]}>
                          <div className={styles["daily-fill"]} style={{ width: "42%" }} />
                        </div>
                        <div className={styles["daily-meta"]}>42% toward today’s target</div>

                        <button
                          type="button"
                          className={styles["daily-cta"]}
                          onClick={() => {
                            setShowLogForm((v) => !v);
                          }}
                        >
                          Log Today’s Progress
                        </button>

                        {showLogForm && (
                          <div className={styles["log-form"]}>
                            <div className={styles["log-row"]}>
                              <label className={styles["log-label"]}>Book</label>
                              <select
                                className={styles["log-select"]}
                                value={logForm.story_id}
                                onChange={(e) => setLogForm((p) => ({ ...p, story_id: e.target.value }))}
                              >
                                <option value="">Select a manuscript</option>
                                {[...drafts, ...inProgress, ...published].map((b) => (
                                  <option key={b.story_id} value={b.story_id}>
                                    {b.title || "Untitled"}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div className={styles["log-row"]}>
                              <label className={styles["log-label"]}>Word Count</label>
                              <input
                                className={styles["log-input"]}
                                type="number"
                                min={0}
                                value={logForm.wordCount}
                                onChange={(e) => setLogForm((p) => ({ ...p, wordCount: e.target.value }))}
                                placeholder="How many words did you add today?"
                              />
                            </div>

                            <div className={styles["log-row"]}>
                              <label className={styles["log-label"]}>
                                Time Spent ({logForm.timeSpentMinutes} min)
                              </label>
                              <input
                                className={styles["log-slider"]}
                                type="range"
                                min={0}
                                max={240}
                                value={logForm.timeSpentMinutes}
                                onChange={(e) => setLogForm((p) => ({ ...p, timeSpentMinutes: Number(e.target.value) }))}
                              />
                            </div>

                            <div className={styles["log-row"]}>
                              <label className={styles["log-label"]}>Mood / Notes</label>
                              <textarea
                                className={styles["log-textarea"]}
                                value={logForm.moodNotes}
                                onChange={(e) => setLogForm((p) => ({ ...p, moodNotes: e.target.value }))}
                                placeholder="Any breakthroughs or notes on this session?"
                              />
                            </div>

                            <button
                              type="button"
                              className={styles["log-save"]}
                              disabled={logSaving}
                              onClick={async () => {
                                const wordCountNum = Number(logForm.wordCount);
                                if (!logForm.story_id) {
                                  setToast({ type: "error", message: "Select a manuscript first." });
                                  return;
                                }
                                if (!Number.isFinite(wordCountNum) || wordCountNum < 0) {
                                  setToast({ type: "error", message: "Enter a valid word count." });
                                  return;
                                }

                                setLogSaving(true);
                                try {
                                  // Persist to backend + update streak from response
                                  const payload = {
                                    story_id: logForm.story_id,
                                    wordCount: wordCountNum,
                                    timeSpentMinutes: logForm.timeSpentMinutes,
                                    moodNotes: logForm.moodNotes,
                                  };

                                  const data = await upsertWritingProgress(payload);
                                  if (data?.streak?.days != null) setStreak({ days: data.streak.days });
                                  setToast({ type: "success", message: "Log saved! Keep the streak alive." });
                                  setShowLogForm(false);
                                  setLogForm({ story_id: "", wordCount: "", timeSpentMinutes: 10, moodNotes: "" });
                                } catch {
                                  setToast({ type: "error", message: "Failed to save log." });
                                } finally {
                                  setLogSaving(false);
                                  setTimeout(() => setToast(null), 2800);
                                }
                              }}
                            >
                              {logSaving ? "Saving..." : "Save Log"}
                            </button>
                          </div>
                        )}

                        {toast && (
                          <div className={styles["toast"]} data-type={toast.type}>
                            {toast.message}
                          </div>
                        )}
                      </div>

                      <div className={styles["outline-routine-card"]}>
                        <div className={styles["outline-routine-title"]}>Quick Outline</div>
                        <div className={styles["outline-routine-item"]}>• Scene goal: Start with a spark</div>
                        <div className={styles["outline-routine-item"]}>• Character beat: Reveal one secret</div>
                        <div className={styles["outline-routine-item"]}>• Next step: Write 200 words</div>
                      </div>
                    </div>
                  </div>
                </section>
              )}


            </section>


          </div>

          {editingBook && (
            <div
              className={styles["edit-modal-backdrop"]}
              onClick={() => setEditingBook(null)}
            >
              <div
                className={styles["edit-modal"]}
                onClick={(e) => e.stopPropagation()}
              >
                <h2 className={styles["edit-modal-title"]}>Edit Book Details</h2>

                {editingBook.cover_url && (
                  <div className={styles["edit-cover-preview"]}>
                    <img
                      src={editingBook.cover_url}
                      alt="Current cover"
                      className={styles["edit-cover-image"]}
                    />
                    <p className={styles["edit-cover-caption"]}>Current cover</p>
                  </div>
                )}

                <div className={styles["edit-modal-body"]}>
                  <div>
                    <label className={styles["edit-field-label"]}>Title</label>
                    <input
                      type="text"
                      name="title"
                      value={editForm.title}
                      onChange={handleEditFieldChange}
                      className={styles["edit-input"]}
                    />
                  </div>

                  <div>
                    <label className={styles["edit-field-label"]}>Description</label>
                    <textarea
                      name="description"
                      value={editForm.description}
                      onChange={handleEditFieldChange}
                      placeholder="Write a short blurb about your book..."
                      className={styles["edit-textarea"]}
                    />
                  </div>

                  <div>
                    <label className={styles["edit-field-label"]}>Category</label>
                    <select
                      name="category"
                      value={editForm.category}
                      onChange={handleEditFieldChange}
                      className={styles["edit-select"]}
                    >
                      <option value="">Select a category</option>
                      {CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className={styles["edit-field-label"]}>Tags (select multiple)</label>
                    <div className={styles["edit-tags-container"]}>
                      {TAGS.map((tag) => {
                        const isSelected = Array.isArray(editForm.tags) && editForm.tags.includes(tag);
                        return (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => handleTagToggle(tag)}
                            className={`${styles["edit-tag-button"]} ${isSelected ? styles["edit-tag-button-selected"] : ""}`}
                          >
                            {tag}
                          </button>
                        );
                      })}
                    </div>
                    {Array.isArray(editForm.tags) && editForm.tags.length > 0 && (
                      <p className={styles["edit-tags-selected-text"]}>
                        Selected: {editForm.tags.join(", ")}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className={styles["edit-field-label"]}>Change Cover Image</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleCoverChange}
                      className={styles["edit-file-input"]}
                    />
                  </div>
                </div>

                <div className={styles["edit-actions"]}>
                  <button
                    type="button"
                    onClick={() => setEditingBook(null)}
                    disabled={saving}
                    className={styles["edit-btn-cancel"]}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveDetails}
                    disabled={saving}
                    className={styles["edit-btn-save"]}
                  >
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
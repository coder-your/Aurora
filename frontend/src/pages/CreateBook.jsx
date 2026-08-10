import React, { useState } from "react";
import { createBook } from "../services/bookService";
import CoverUpload from "../components/CoverUpload";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
 import styles from "../styles/CreateBook.module.css";
const CATEGORIES = [
  "Adventure","Romance","Fantasy","Science Fiction","Mystery","Thriller",
  "Horror","Drama","Historical Fiction","General Fiction","Humor","Poetry",
  "Paranormal","Young Adult","Short Story"
];

const TAGS = [
  "Adventure","Friendship","Found Family","Inspiring","Hopeful","Uplifting","Wholesome",
  "Funny","Lighthearted","Heartwarming","Emotional","Nostalgic","Imaginative","Magical",
  "Mystery Vibes","Calm","Cozy","Creative","Exciting","Dramatic","Motivational",
  "Slice of Life","Courage","Teamwork","Discovery","Problem-Solving","Coming of Age",
  "Fantasy Elements","Thought-Provoking","Short & Sweet"
];

export default function CreateBook() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [tags, setTags] = useState([]);
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const navigate = useNavigate();

  const handleTagSelect = (tag) => {
    if (tags.includes(tag)) setTags(tags.filter(t => t !== tag));
    else setTags([...tags, tag]);
  };

  const handleSubmit = async () => {
    setError("");
    if (!title.trim()) return setError("Title is required");
    if (!description.trim()) return setError("Description is required");
    if (!category) return setError("Please select a category");
    if (tags.length === 0) return setError("Please choose at least 1 tag");

    setLoading(true);
    setUploadProgress(0);

    try {
      // Step 1: Create book (metadata only)
      const data = {
        title,
        description,
        category,
        tags,
        cover_url: "", // initially empty
        is_mature: false,
        has_copyright: true
      };

      const book = await createBook(data);
      const story_id = book.story_id;

      if (!story_id) {
        setError("Book creation failed. No story_id returned.");
        setLoading(false);
        return;
      }

      // Step 2: Upload cover if selected
      if (coverFile) {
        const formData = new FormData();
        formData.append("file", coverFile);
        formData.append("story_id", story_id);

        await api.post("/api/upload/cover", formData, {
          onUploadProgress: (e) => {
            if (e.total) {
              const progress = Math.round((e.loaded * 100) / e.total);
              setUploadProgress(progress);
            }
          }
        });
      }

      // Step 3: Redirect to chapter editor
      navigate(`/books/${story_id}/chapters`);
    } catch (err) {
      console.error("CreateBook error:", err.response?.data || err);
      setError(err.response?.data?.message || "Failed to create book");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <header className={styles.header}>
          <h1 className={styles.title}>Create Book</h1>
          <p className={styles.subtitle}>Shape a new story under the stars.</p>
        </header>

        {error && <p className={styles.error}>{error}</p>}

        <div className={styles.splitLayout}>
          {/* Left: real-time preview shelf */}
          <aside className={styles.leftPreview}>
            <div className={styles.previewShelf}>
              <CoverUpload
                coverFile={coverFile}
                setCoverFile={setCoverFile}
                preview={coverPreview}
                setPreview={setCoverPreview}
              />
            </div>
            {uploadProgress > 0 && uploadProgress < 100 && (
              <div className={styles.progressBarOuter}>
                <div
                  className={styles.progressBarInner}
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            )}
          </aside>

          {/* Right: soft manuscript form */}
          <section className={styles.rightForm}>
            <div className={styles.formBlock}>
              <div className={styles.field}>
                <label className={styles.fieldLabel}>Title</label>
                <input
                  className={styles.input}
                  placeholder=""
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div className={styles.field}>
                <label className={styles.fieldLabel}>Description</label>
                <textarea
                  className={styles.textarea}
                  placeholder=""
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className={styles.field}>
                <label className={styles.fieldLabel}>Category</label>
                <select
                  className={styles.select}
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <option value="">Select Category</option>
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className={styles.tagsBlock}>
              <div className={styles.tagsHeader}>Tags</div>
              <div className={styles.tagGrid}>
                {TAGS.map((tag) => (
                  <button
                    type="button"
                    key={tag}
                    onClick={() => handleTagSelect(tag)}
                    className={`${styles.tagButton} ${
                      tags.includes(tag) ? styles.tagActive : styles.tagInactive
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.actionsRow}>
              <button
                className={`${styles.buttonPrimary} ${
                  loading ? styles.disabled : ""
                }`}
                onClick={handleSubmit}
                disabled={loading}
              >
                {loading ? "Creating..." : "Create Book"}
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
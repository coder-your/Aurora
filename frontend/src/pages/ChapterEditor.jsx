// ChapterEditor.jsx
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "react-router-dom";
import { $getRoot, $getSelection, $createParagraphNode, $createTextNode } from "lexical";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { ListNode, ListItemNode } from "@lexical/list";

import EditorToolbar from "../components/EditorToolbar";
import DictionaryTooltip from "../components/DictionaryTooltip";
import AIWritingAssistant from "../components/AIWritingAssistant";
import PlotTwistEventManager from "../components/PlotTwistEventManager";
import api from "../services/api";
import styles from "../styles/chapterEditor.module.css"; // adjust the path if needed

/* ---------------------- Utilities ---------------------- */
function stripSignature(raw = "") {
  if (!raw) return "";
  const sigMarker = "\n---\n";
  const idx = raw.lastIndexOf(sigMarker);
  if (idx === -1) return raw;
  const after = raw.slice(idx + sigMarker.length);
  if (/Signature:/i.test(after)) return raw.slice(0, idx).trimEnd();
  return raw;
}

function safeParseDelta(delta) {
  if (!delta) return null;
  if (typeof delta === "string") {
    try { return JSON.parse(delta); } catch (e) { void e; return null; }
  }
  if (typeof delta === "object") return delta;
  return null;
}

function sanitizeBeforeSend(s) {
  if (!s) return "";
  return s.split("\0").join("").replace(/\r\n/g, "\n").trim();
}

/* ---------------------- Main Component ---------------------- */
export default function ChapterEditor() {
  const { story_id } = useParams();

  const editorRef = useRef(null); // Ref for Lexical editor
  const autosaveTimerRef = useRef(null);

  /* ---------- Core State ---------- */
  const [chapters, setChapters] = useState([]);
  const [currentChapterId, setCurrentChapterId] = useState(null);
  const [title, setTitle] = useState("");
  const [contentDelta, setContentDelta] = useState(null);
  const [rawContent, setRawContent] = useState("");

  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [paragraphs, setParagraphs] = useState(0);
  const [readingMinutes, setReadingMinutes] = useState(0);
  const [versions, setVersions] = useState([]);
  const [bookStatus, setBookStatus] = useState("draft");
  const [selectedWord, setSelectedWord] = useState("");
  const [selectedText, setSelectedText] = useState("");
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 });
  const [editorKey, setEditorKey] = useState(0);
  const [previewHtml, setPreviewHtml] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [saveStatus, setSaveStatus] = useState("idle");
  const [theme, setTheme] = useState("light");

  // UI feedback for manual version saves
  const [versionToast, setVersionToast] = useState("");

  // Version editing state
  const [editingVersion, setEditingVersion] = useState(null);
  const [versionContent, setVersionContent] = useState("");

  /* ---------- Fetch Chapters ---------- */
  const fetchChapters = async () => {
    if (!story_id) return;
    try {
      const res = await api.get(`/api/books/${story_id}`);
      const story = res.data || {};
      setChapters(Array.isArray(story.chapters) ? story.chapters : []);
      setBookStatus(story.status || "draft");

      if ((!currentChapterId || !story.chapters?.some(c => c.chapter_id === currentChapterId)) && story.chapters?.length) {
        setCurrentChapterId(story.chapters[0].chapter_id);
      }
    } catch (err) {
      console.error("Failed to fetch chapters:", err?.response?.data || err?.message || err);
      setChapters([]);
    }
  };

  useEffect(() => {
    fetchChapters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [story_id]);

  /* ---------- Versions ---------- */
  const fetchVersions = async (chapterId) => {
    try {
      const res = await api.get(`/api/chapters/${chapterId}/versions`);
      setVersions(res.data || []);
    } catch (err) {
      console.error("Failed to fetch versions:", err?.response?.data || err?.message || err);
      setVersions([]);
    }
  };

  /* ---------- Load Chapter into Editor ---------- */
  useEffect(() => {
    if (!currentChapterId) {
      setTitle(""); setContentDelta(null); setRawContent("");
      setWordCount(0); setCharCount(0); setParagraphs(0); setReadingMinutes(0);
      setVersions([]);
      return;
    }

    const chapter = chapters.find(c => c.chapter_id === currentChapterId);
    if (!chapter) return;

    setTitle(chapter.title || "Untitled Chapter");
    setContentDelta(safeParseDelta(chapter.content_delta));
    setRawContent(stripSignature(chapter.content_raw || ""));
    setWordCount(chapter.word_count || 0);
    setCharCount(chapter.char_count || 0);
    setParagraphs(chapter.paragraphs || 0);
    setReadingMinutes(chapter.reading_minutes || 0);

    fetchVersions(chapter.chapter_id);
    setEditorKey(prev => prev + 1);
  }, [currentChapterId, chapters]);

  const handleRestoreVersion = async (version_id) => {
    try {
      await api.post(`/api/chapters/${currentChapterId}/versions/restore`, { version_id });
      await fetchChapters();
      setEditingVersion(null);
    } catch (err) {
      console.error("Failed to restore version:", err?.response?.data || err?.message || err);
    }
  };

  const handleViewVersion = (version) => {
    setEditingVersion(version);
    setVersionContent(version.content_raw || "");
  };

  const handleSaveVersionAsCurrent = async () => {
    if (!currentChapterId || !editingVersion) return;
    try {
      setSaveStatus("saving");
      const sanitized = sanitizeBeforeSend(versionContent);
      
      await api.patch(`/api/chapters/${currentChapterId}/autosave`, {
        content_raw: sanitized,
        content_delta: null, // Reset delta since we're using raw text
      });
      
      await fetchChapters();
      setEditingVersion(null);
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 1200);
    } catch (err) {
      console.error("Failed to save version as current:", err);
      setSaveStatus("failed");
      setTimeout(() => setSaveStatus("idle"), 2000);
    }
  };

  const handleDeleteVersion = async (version_id) => {
    try {
      if (!currentChapterId) return;
      await api.delete(`/api/chapters/${currentChapterId}/versions/${version_id}`);
      await fetchVersions(currentChapterId);
    } catch (err) {
      console.error("Failed to delete version:", err?.response?.data || err?.message || err);
    }
  };

  /* ---------- Autosave ---------- */
  const autosave = useCallback(async (editor) => {
    if (!currentChapterId || !editor) return;
    try {
      setSaveStatus("saving");

      let raw = "";
      editor.update(() => {
        raw = $getRoot().getTextContent() || "";
      });

      const sanitized = sanitizeBeforeSend(raw);

      const res = await api.patch(`/api/chapters/${currentChapterId}/autosave`, {
        content_raw: sanitized,
        content_delta: contentDelta || null,
      });

      if (res.data?.chapter) {
        const ch = res.data.chapter;
        setWordCount(ch.word_count || 0);
        setCharCount(ch.char_count || 0);
        setParagraphs(ch.paragraphs || 0);
        setReadingMinutes(ch.reading_minutes || 0);
        setRawContent(ch.content_raw || "");
        fetchVersions(currentChapterId);
      }

      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 1200);
    } catch (err) {
      console.error("Autosave failed:", err?.response?.data || err?.message || err);
      setSaveStatus("failed");
      setTimeout(() => setSaveStatus("idle"), 2000);
    }
  }, [currentChapterId, contentDelta]);

  const debounceAutosave = useCallback(
    (editor) => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }
      autosaveTimerRef.current = setTimeout(() => autosave(editor), 1000);
    },
    [autosave]
  );

  useEffect(() => {
    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }
    };
  }, []);

  /* ---------- Handle Content Changes ---------- */
  const handleContentChange = useCallback((editorState, editor) => {
    let delta = null;
    try {
      const json = editor.getEditorState().toJSON ? editor.getEditorState().toJSON() : null;
      if (json) setContentDelta(json);
    } catch (e) {
      console.error("Failed to get editor state JSON:", e);
    }
    setContentDelta(delta);

    editorState.read(() => {
      const text = $getRoot().getTextContent() || "";
      const words = text.trim().split(/\s+/).filter(Boolean).length;
      const chars = text.length;
      const paras = text.split(/\n{2,}/).filter(Boolean).length;
      setWordCount(words);
      setCharCount(chars);
      setParagraphs(paras);
      setReadingMinutes(Math.ceil(words / 200));
    });

    debounceAutosave(editor);
  }, [debounceAutosave]);

  /* ---------- Initial Editor State ---------- */
  const getInitialEditorState = (editor) => {
    editorRef.current = editor; // Save ref
    editor.update(() => {
      const root = $getRoot();
      root.clear();

      if (contentDelta && typeof contentDelta === "object") {
        try {
          const state = editor.parseEditorState(JSON.stringify(contentDelta));
          if (state) { editor.setEditorState(state); return; }
        } catch (e) {
          console.error("Failed to parse editor state:", e);
        }
      }

      const lines = (rawContent || "").split("\n");
      if (!lines.length) lines.push("");
      lines.forEach(line => {
        const p = $createParagraphNode();
        p.append($createTextNode(line));
        root.append(p);
      });
    });
  };

  /* ---------- Title & Book Status Updates ---------- */
  const updateTitle = async (value) => {
    setTitle(value);
    if (!currentChapterId) return;
    try {
      await api.patch(`/api/chapters/${currentChapterId}`, { title: value });
      await fetchChapters();
    } catch (err) { console.error(err); }
  };

  const updateBookStatus = async (status) => {
  setBookStatus(status); // local update

  try {
    if (status === "published") {
      // Call publish endpoint (backend expects /publish)
      await api.patch(`/api/books/${story_id}/publish`);
    } else {
      // Draft or in_progress: simple PATCH
      await api.patch(`/api/books/${story_id}`, { status });
    }

    // Dispatch global event for live dashboard update
    window.dispatchEvent(new CustomEvent("book-status-changed", {
      detail: { story_id, status }
    }));

    alert(`Book status updated to: ${status}`);
    fetchChapters(); // refresh chapters & status

  } catch (err) {
    console.error(err);
    const msg = err?.response?.data?.message || err?.message || "Failed to update status";
    alert(msg);
    // revert dropdown if failed
    setBookStatus(prev => prev); 
  }
};




  /* ---------- Chapter CRUD ---------- */
  const handleCreateChapter = async () => {
    try {
      const res = await api.post(`/api/books/${story_id}/chapters`, { title: "Untitled Chapter" });
      await fetchChapters();
      if (res?.data?.chapter_id) setCurrentChapterId(res.data.chapter_id);
    } catch (err) { console.error(err); }
  };

  const handleDeleteChapter = async (chapter_id) => {
    try {
      await api.delete(`/api/chapters/${chapter_id}`);
      await fetchChapters();
      if (chapter_id === currentChapterId) setCurrentChapterId(null);
    } catch (err) { console.error(err); }
  };

  const moveChapter = (chapterId, direction) => {
  const idx = chapters.findIndex(c => c.chapter_id === chapterId);
  if (idx === -1) return;
  const copy = [...chapters];
  const swapIdx = direction === "up" ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= copy.length) return;
  [copy[idx], copy[swapIdx]] = [copy[swapIdx], copy[idx]];
  copy.forEach((c, i) => c.order_index = i + 1);
  setChapters(copy);

  // Reorder chapters
  // ChapterEditor.jsx
api.patch(`/api/books/${story_id}/chapters/reorder`, {
  order: copy.map(c => ({ chapter_id: c.chapter_id, order_index: c.order_index }))
});

}; 
  /* ---------- Chapter Switch with Save ---------- */
  const handleChapterSwitch = async (newChapterId) => {
    if (editorRef.current && currentChapterId) {
      await autosave(editorRef.current);
    }
    setCurrentChapterId(newChapterId);
  };

  /* ---------- Tooltip & Selection ---------- */
  const handleMouseUp = () => {
    const selection = window.getSelection();
    const selected = selection?.toString().trim();

    // Store selected text for AI Assistant
    setSelectedText(selected || "");

    if (selected) {
      // Extract just the first word (remove punctuation and spaces)
      const firstWord = selected.split(/\s+/)[0].replace(/[^\w'-]/g, "");

      // Only show tooltip if it's a valid word (at least 2 characters)
      if (firstWord && firstWord.length >= 2) {
        setSelectedWord(firstWord);
        const rect = selection.getRangeAt(0).getBoundingClientRect();
        setTooltipPos({
          top: rect.bottom + window.scrollY + 5,
          left: rect.left + window.scrollX,
        });
      } else {
        setSelectedWord("");
      }
    } else {
      setSelectedWord("");
    }
  };

  const handleContextMenu = (e) => {
    e.preventDefault(); // Prevent default context menu
    
    const selection = window.getSelection();
    const selectedText = selection?.toString().trim();
    
    if (selectedText) {
      // Extract just the first word (remove punctuation and spaces)
      const firstWord = selectedText.split(/\s+/)[0].replace(/[^\w'-]/g, "");
      
      // Only show tooltip if it's a valid word (at least 2 characters)
      if (firstWord && firstWord.length >= 2) {
        setSelectedWord(firstWord);
        const rect = selection.getRangeAt(0).getBoundingClientRect();
        setTooltipPos({
          top: rect.bottom + window.scrollY + 5,
          left: rect.left + window.scrollX,
        });
      } else {
        setSelectedWord("");
      }
    } else {
      setSelectedWord("");
    }
  };

  const handleCopy = (e) => {
    // Prevent text copying for plagiarism protection
    e.preventDefault();
    return false;
  };

  /* ---------- Preview ---------- */
  const handlePreview = async () => {
    if (!currentChapterId) return;
    try {
      const res = await api.get(`/api/chapters/${currentChapterId}/preview`);
      setPreviewHtml(res.data.html || "<div>No preview</div>");
      setShowPreview(true);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className={styles.writerDashboard}>
      {/* ---------------- Sidebar ---------------- */}
      <aside className={styles.chapterSidebar}>
        <h2>Chapters</h2>
        <div className={styles.chapterList}>
          {chapters.map((c, i) => (
            <div
              key={c.chapter_id}
              className={`${styles.chapterListItem} ${c.chapter_id === currentChapterId ? styles.active : ""}`}
            >
              <button
                className={styles.chapterTitleButton}
                onClick={() => handleChapterSwitch(c.chapter_id)}
              >
                {c.title || "Untitled Chapter"}
              </button>

              <div className={styles.chapterMetaRow}>
                <span className={styles.chapterMetaText}>Words: {c.word_count || 0}</span>
                <div className={styles.chapterActions}>
                  <button
                    className={styles.buttonIconSm}
                    onClick={() => moveChapter(c.chapter_id, "up")}
                    disabled={i === 0}
                    title="Move up"
                  >
                    ↑
                  </button>
                  <button
                    className={styles.buttonIconSm}
                    onClick={() => moveChapter(c.chapter_id, "down")}
                    disabled={i === chapters.length - 1}
                    title="Move down"
                  >
                    ↓
                  </button>
                  <button
                    className={`${styles.buttonIconSm} ${styles.textRed}`}
                    onClick={() => handleDeleteChapter(c.chapter_id)}
                    title="Delete chapter"
                  >
                    ✕
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <button className={styles.buttonPrimary} onClick={handleCreateChapter}>+ New Chapter</button>

        <div className="mt-6">
          <h3 className="font-semibold mb-1">Book Status</h3>
          <select
            value={bookStatus}
            onChange={e => updateBookStatus(e.target.value)}
            className={styles.inputSelect}
          >
            <option value="draft">Draft</option>
            <option value="in_progress">In Progress</option>
            <option value="published">Published</option>
          </select>
        </div>

        {bookStatus === "published" && story_id && (
          <div style={{ marginTop: "1.5rem" }}>
            <PlotTwistEventManager storyId={Number(story_id)} chapters={chapters} />
          </div>
        )}
      </aside>

      {/* ---------------- Editor ---------------- */}
      <main className={styles.editorWrapper}>
        <div className={styles.editorHeaderRow}>

          <input
            type="text"
            placeholder="Chapter Title"
            value={title}
            onChange={e => updateTitle(e.target.value)}
            className={styles.editorTitle}
          />

          <div className={styles.editorHeaderActions}>
            <button className={styles.button} onClick={handlePreview} disabled={!currentChapterId}>Preview</button>
            <button
              className={styles.button}
              onClick={async () => {
                if (!currentChapterId) return;
                // Prevent spam: if latest version has same char_count as current content, skip
                const latest = versions && versions.length > 0 ? versions[0] : null;
                if (latest && (latest.char_count || 0) === (charCount || 0)) {
                  setVersionToast("No changes since last version");
                  setTimeout(() => setVersionToast(""), 1800);
                  return;
                }
                try {
                  await api.post(`/api/chapters/${currentChapterId}/versions/save`);
                  await fetchVersions(currentChapterId);
                  setVersionToast("Version saved");
                  setTimeout(() => setVersionToast(""), 1800);
                } catch (err) {
                  console.error("Failed to save manual version:", err?.response?.data || err?.message || err);
                  setVersionToast("Failed to save version");
                  setTimeout(() => setVersionToast(""), 2000);
                }
              }}
            >
              Save Version
            </button>
            <button className={styles.button} onClick={async () => { if (currentChapterId) await fetchVersions(currentChapterId); }}>Refresh Versions</button>

            <span className="text-sm text-gray-500">
              {saveStatus === "saving" ? "Saving..." : saveStatus === "saved" ? "Saved" : saveStatus === "failed" ? "Failed" : ""}
            </span>
            {versionToast && (
              <span
                style={{
                  marginLeft: 8,
                  fontSize: "0.8rem",
                  padding: "2px 8px",
                  borderRadius: 999,
                  backgroundColor: versionToast === "Version saved" ? "#dcfce7" : "#fef9c3",
                  color: "#374151",
                }}
              >
                {versionToast}
              </span>
            )}
          </div>
        </div>

        <div 
          className={styles.editorContainer} 
          onMouseUp={handleMouseUp}
          onContextMenu={handleContextMenu}
          onCopy={handleCopy}
          style={{ userSelect: 'text' }}
        >
          {currentChapterId && (
            <LexicalComposer
              key={editorKey}
              initialConfig={{
                namespace: `MyEditor_${story_id}_${currentChapterId}`,
                nodes: [ListNode, ListItemNode],
                theme: { paragraph: styles.editorText },
                onError: console.error,
                initialEditorState: getInitialEditorState
              }}
            >
              <EditorToolbar theme={theme} setTheme={setTheme} />

              <RichTextPlugin
                contentEditable={
                  <ContentEditable className={`${styles.editorText} min-h-[300px] outline-none p-2 rounded ${theme === "dark" ? "bg-gray-900 text-white" : "bg-white text-black"}`} />
                }
                placeholder={<div className="text-gray-400">Start writing...</div>}
              />

              <HistoryPlugin />
              <OnChangePlugin onChange={handleContentChange} />
              <ListPlugin />
            </LexicalComposer>
          )}

          {selectedWord && <DictionaryTooltip word={selectedWord} position={tooltipPos} onClose={() => setSelectedWord("")} />}
        </div>

        <div className="flex flex-wrap gap-4 text-sm text-gray-500">
          <div>Words: {wordCount}</div>
          <div>Chars: {charCount}</div>
          <div>Paragraphs: {paragraphs}</div>
          <div>Est. Minutes: {readingMinutes}</div>
        </div>

        <div className={styles.versionsBox}>
          <h3 className="font-semibold mb-2">Versions</h3>
          {versions.length === 0 && <div className="text-xs text-gray-400">No versions</div>}
          {versions.map(v => (
            <div key={v.version_id} className={styles.versionItem}>
              <div>
                <div className="text-sm">{new Date(v.created_at).toLocaleString()}</div>
                <div className="text-xs text-gray-400">Words: {v.word_count || 0}</div>
              </div>
              <div className="flex gap-1">
                <button 
                  className={styles.buttonSm} 
                  onClick={() => handleViewVersion(v)}
                  style={{ backgroundColor: "#e8c96e", color: "#1A1A1A", fontWeight: "600" }}
                >
                  View/Edit
                </button>
                <button className={styles.buttonSm} onClick={() => handleRestoreVersion(v.version_id)}>Restore</button>
                <button
                  className={styles.buttonSm}
                  onClick={() => handleDeleteVersion(v.version_id)}
                  style={{ backgroundColor: "#FEE2E2", color: "#991B1B" }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>

      {showPreview && (
        <div className={styles.previewBackdrop} onClick={() => setShowPreview(false)}>
          <div className={styles.previewBox} onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold">Preview</h3>
              <button className={styles.buttonSm} onClick={() => setShowPreview(false)}>Close</button>
            </div>
            <div dangerouslySetInnerHTML={{ __html: previewHtml || "<div>No preview</div>" }} />
          </div>
        </div>
      )}

      {/* Version Edit Modal */}
      {editingVersion && (
        <div 
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(26,26,26,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
          }}
          onClick={() => setEditingVersion(null)}
        >
          <div 
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: "16px",
              padding: "20px 22px",
              width: "min(90%, 720px)",
              maxHeight: "80vh",
              display: "flex",
              flexDirection: "column",
              gap: "14px",
              boxShadow: "0 12px 36px rgba(0,0,0,0.18)",
              overflow: "hidden",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ fontSize: "20px", fontWeight: "700", color: "#021E47" }}>
                Edit Version - {new Date(editingVersion.created_at).toLocaleString()}
              </h2>
              <button 
                onClick={() => setEditingVersion(null)}
                style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "#6b7280" }}
              >
                ✕
              </button>
            </div>

            <div
              style={{
                fontSize: "12px",
                color: "#6b7280",
                padding: "8px 12px",
                backgroundColor: "#F8F5F2",
                borderRadius: "6px",
              }}
            >
              Words: {versionContent.trim().split(/\s+/).filter(Boolean).length}
            </div>

            <textarea
              value={versionContent}
              onChange={(e) => setVersionContent(e.target.value)}
              style={{
                flex: "1 1 auto",
                minHeight: "220px",
                maxHeight: "50vh",
                padding: "14px",
                border: "1px solid #E4DFDB",
                borderRadius: "10px",
                fontSize: "14px",
                lineHeight: "1.7",
                resize: "vertical",
                fontFamily: "inherit",
                backgroundColor: "#FFFFFF",
                overflow: "auto",
              }}
              placeholder="Version content..."
            />

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "10px",
                marginTop: "4px",
              }}
            >
              <button
                onClick={() => setEditingVersion(null)}
                style={{
                  padding: "10px 20px",
                  backgroundColor: "#E4DFDB",
                  color: "#1A1A1A",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontWeight: "500",
                  fontSize: "14px",
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleRestoreVersion(editingVersion.version_id)}
                style={{
                  padding: "10px 20px",
                  backgroundColor: "#2E7D66",
                  color: "#FFFFFF",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontWeight: "500",
                  fontSize: "14px",
                }}
              >
                Restore Original
              </button>
              <button
                onClick={handleSaveVersionAsCurrent}
                style={{
                  padding: "10px 20px",
                  backgroundColor: "#e8c96e",
                  color: "#1A1A1A",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontWeight: "600",
                  fontSize: "14px",
                  boxShadow: "0 2px 8px rgba(232,201,110,0.3)",
                }}
              >
                Save as Current Chapter
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Writing Assistant */}
      <AIWritingAssistant
        storyId={parseInt(story_id, 10)}
        selectedText={selectedText}
        onInsertText={(text) => {
          // Insert text at cursor position in editor
          if (editorRef.current) {
            editorRef.current.update(() => {
              const selection = $getSelection();
              if (selection) {
                selection.insertText(text);
              } else {
                // If no selection, insert at end
                const root = $getRoot();
                const paragraph = $createParagraphNode();
                paragraph.append($createTextNode(text));
                root.append(paragraph);
              }
            });
          }
        }}
      />
    </div>
  );
}

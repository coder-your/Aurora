import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { $getRoot, $createParagraphNode, $createTextNode } from "lexical";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { ListNode, ListItemNode } from "@lexical/list";

import EditorToolbar from "../components/EditorToolbar";
import DictionaryTooltip from "../components/DictionaryTooltip";
import api from "../services/api";



function stripSignature(raw = "") {
  if (!raw) return "";
  const text = raw.replace(/\r\n/g, "\n");
  const sigMarker = "\n---\n";
  const idx = text.lastIndexOf(sigMarker);
  if (idx === -1) return text;
  const after = text.slice(idx + sigMarker.length);
  if (/Signature:/i.test(after)) return text.slice(0, idx).trimEnd();
  return text;
}

function safeParseDelta(delta) {
  if (!delta) return null;
  if (typeof delta === "string") {
    try {
      return JSON.parse(delta);
    } catch (_e) {
      void _e;
      return null;
    }
  }
  if (typeof delta === "object") return delta;
  return null;
}

export default function ChapterEditor({ user: _user }) {
  const { story_id } = useParams();
  const [chapters, setChapters] = useState([]);
  const [currentChapterId, setCurrentChapterId] = useState(null);
  const [title, setTitle] = useState("");

  const [contentDelta, setContentDelta] = useState(null); // serialized editor state (object)
  const [rawContent, setRawContent] = useState(""); // plaintext WITHOUT backend signature

  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [paragraphs, setParagraphs] = useState(0);
  const [readingMinutes, setReadingMinutes] = useState(0);
  const [versions, setVersions] = useState([]);
  const [bookStatus, setBookStatus] = useState("draft");
  const [selectedWord, setSelectedWord] = useState("");
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 });
  const [editorKey, setEditorKey] = useState(0);

  const [previewHtml, setPreviewHtml] = useState(null);
  const [showPreview, setShowPreview] = useState(false);

  const [saveStatus] = useState("idle"); // idle | saving | saved | failed

  // -------------------
  // Fetch book + chapters
  // -------------------
  const fetchChapters = async () => {
    if (!story_id) return;
    try {
      const res = await api.get(`/api/books/${story_id}`);
      const story = res.data;
      setChapters(story.chapters || []);
      setBookStatus(story.status || "draft");
      if (!currentChapterId && story.chapters?.length) {
        setCurrentChapterId(story.chapters[0].chapter_id);
      } else {
        if (!story.chapters?.some((c) => c.chapter_id === currentChapterId) && story.chapters?.length) {
          setCurrentChapterId(story.chapters[0].chapter_id);
        }
      }
    } catch (err) {
      console.error("Failed to fetch chapters:", err?.response?.data || err?.message || err);
    }
  };

  useEffect(() => {
    fetchChapters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [story_id]);

  // -------------------
  // Load current chapter
  // -------------------
  useEffect(() => {
    if (!currentChapterId) {
      setTitle("");
      setContentDelta(null);
      setRawContent("");
      setWordCount(0);
      setCharCount(0);
      setParagraphs(0);
      setReadingMinutes(0);
      setVersions([]);
      return;
    }

    const chapter = chapters.find((c) => c.chapter_id === currentChapterId);
    if (chapter) {
      setTitle(chapter.title || "Untitled Chapter");

      const parsedDelta = safeParseDelta(chapter.content_delta);
      const rawNoSig = stripSignature(chapter.content_raw || "");

      setContentDelta(parsedDelta);
      setRawContent(rawNoSig);
      setWordCount(chapter.word_count || 0);
      setCharCount(chapter.char_count || 0);
      setParagraphs(chapter.paragraphs || 0);
      setReadingMinutes(chapter.reading_minutes || 0);
      fetchVersions(chapter.chapter_id);

      // force remount editor so Lexical picks up initial state
      setEditorKey((p) => p + 1);
    }
   
  }, [currentChapterId, chapters]);

  // -------------------
  // Versions
  // -------------------
  const fetchVersions = async (chapterId) => {
    try {
      const res = await api.get(`/api/chapters/${chapterId}/versions`);
      setVersions(res.data || []);
    } catch (err) {
      console.error("Failed to fetch versions:", err?.response?.data || err?.message || err);
      setVersions([]);
    }
  };

  const handleRestoreVersion = async (version_id) => {
    try {
      await api.post(`/api/chapters/${currentChapterId}/versions/restore`, { version_id });
      await fetchChapters();
    } catch (err) {
      console.error("Failed to restore version:", err?.response?.data || err?.message || err);
    }
  };

  // -------------------
  // Handle content changes
  // -------------------
  const handleContentChange = useCallback((editorState, _editor) => {
    try {
      let delta = null;
      try {
        delta = editorState.toJSON ? editorState.toJSON() : null;
      } catch (_e) {
        void _e;
        delta = null;
      }
      setContentDelta(delta);

      editorState.read(() => {
        const text = $getRoot().getTextContent() || "";
        const words = text.trim() ? text.trim().split(/\s+/).filter(Boolean).length : 0;
        const chars = text.length;
        const paras = text.split(/\n{2,}/).filter(Boolean).length;
        setWordCount(words);
        setCharCount(chars);
        setParagraphs(paras);
        setReadingMinutes(Math.ceil(words / 200));
      });
    } catch (e) {
      console.error("Error handling content change", e);
    }
  }, []);

  // -------------------
  // Title / Book status
  // -------------------
  const updateTitle = async (value) => {
    setTitle(value);
    try {
      if (currentChapterId) {
        await api.patch(`/api/chapters/${currentChapterId}/autosave`, { title: value });
      }
    } catch (err) {
      console.error("Title update failed:", err?.response?.data || err?.message || err);
    }
  };

  const updateBookStatus = async (status) => {
    setBookStatus(status);
    try {
      await api.patch(`/api/books/${story_id}`, { status });
    } catch (err) {
      console.error("Failed to update book status:", err?.response?.data || err?.message || err);
    }
  };

  // -------------------
  // Chapter CRUD
  // -------------------
  const handleCreateChapter = async () => {
    try {
      const res = await api.post(`/api/books/${story_id}/chapters`, { title: "Untitled Chapter" });
      await fetchChapters();
      setCurrentChapterId(res.data.chapter_id);
    } catch (err) {
      console.error("Failed to create chapter:", err?.response?.data || err?.message || err);
    }
  };

  const handleDeleteChapter = async (chapter_id) => {
    try {
      await api.delete(`/api/chapters/${chapter_id}`);
      await fetchChapters();
    } catch (err) {
      console.error(err?.response?.data || err?.message || err);
    }
  };

  const _handleRestoreChapter = async (chapter_id) => {
    try {
      await api.post(`/api/chapters/${chapter_id}/restore`);
      await fetchChapters();
    } catch (err) {
      console.error(err?.response?.data || err?.message || err);
    }
  };

  // -------------------
  // Reordering
  // -------------------
  const sendReorder = async (newOrder) => {
    try {
      await api.patch(`/api/books/${story_id}/chapters/reorder`, { order: newOrder });
      await fetchChapters();
    } catch (err) {
      console.error("Reorder failed:", err?.response?.data || err?.message || err);
    }
  };

  const moveChapter = (chapterId, direction) => {
    const idx = chapters.findIndex((c) => c.chapter_id === chapterId);
    if (idx === -1) return;
    const copy = [...chapters];
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= copy.length) return;
    const a = copy[idx];
    const b = copy[swapIdx];
    const aOrder = a.order_index || idx + 1;
    const bOrder = b.order_index || swapIdx + 1;
    copy[idx] = { ...copy[idx], order_index: bOrder };
    copy[swapIdx] = { ...copy[swapIdx], order_index: aOrder };
    const orderPayload = copy.map((c, i) => ({ chapter_id: c.chapter_id, order_index: c.order_index || i + 1 }));
    setChapters(copy);
    sendReorder(orderPayload);
  };

  // -------------------
  // Tooltip
  // -------------------
  const handleMouseUp = () => {
    const selection = window.getSelection();
    const selectedText = selection?.toString().trim();
    
    if (selectedText) {
      // Extract just the first word (remove punctuation and spaces)
      const firstWord = selectedText.split(/\s+/)[0].replace(/[^\w'-]/g, '');
      
      // Only show tooltip if it's a valid word (at least 2 characters)
      if (firstWord && firstWord.length >= 2) {
        setSelectedWord(firstWord);
        const rect = selection.getRangeAt(0).getBoundingClientRect();
        setTooltipPos({ 
          top: rect.bottom + window.scrollY + 5, 
          left: rect.left + window.scrollX 
        });
      } else {
        setSelectedWord("");
      }
    } else {
      setSelectedWord("");
    }
  };

  // -------------------
  // Preview
  // -------------------
  const handlePreview = async () => {
    if (!currentChapterId) return;
    try {
      const res = await api.get(`/api/chapters/${currentChapterId}/preview`);
      setPreviewHtml(res.data.html || "<div>No preview</div>");
      setShowPreview(true);
    } catch (err) {
      console.error("Preview fetch failed:", err?.response?.data || err?.message || err);
    }
  };

  // -------------------
  // Lexical initial state helper (robust)
  // -------------------
  const initialEditorState = (contentDelta)
    ? (editor) => {
        try {
          // contentDelta may be object or string; ensure we pass string to parseEditorState
          const payload = typeof contentDelta === "object" ? JSON.stringify(contentDelta) : contentDelta;
          if (editor.parseEditorState) {
            const state = editor.parseEditorState(payload);
            if (state) {
              editor.setEditorState(state);
              // after applying state, set contentDelta in react state to avoid immediate overwrite
              try {
                const json = editor.getEditorState().toJSON ? editor.getEditorState().toJSON() : null;
                if (json) setContentDelta(json);
              } catch (_e) {
                void _e;
              }
              return;
            }
          }
        } catch (_e) {
          void _e;
        }

        // fallback: insert rawContent preserving line breaks
        editor.update(() => {
          const root = $getRoot();
          root.clear();
          const lines = (rawContent || "").split(/\n/);
          lines.forEach((line) => {
            const p = $createParagraphNode();
            p.append($createTextNode(line));
            root.append(p);
          });
        });

        // set contentDelta after fallback
        try {
          const json = editor.getEditorState().toJSON ? editor.getEditorState().toJSON() : null;
          if (json) setContentDelta(json);
        } catch (_e) {
          void _e;
        }
      }
    : (editor) => {
        editor.update(() => {
          const root = $getRoot();
          root.clear();
          const lines = (rawContent || "").split(/\n/);
          lines.forEach((line) => {
            const p = $createParagraphNode();
            p.append($createTextNode(line));
            root.append(p);
          });
        });
        try {
          const json = editor.getEditorState().toJSON ? editor.getEditorState().toJSON() : null;
          if (json) setContentDelta(json);
        } catch (_e) {
          void _e;
        }
      };

  // -------------------
  // Render
  // -------------------
  return (
    <div className="flex p-6 writer-dashboard space-x-6">
      <div className="w-1/4 border p-2 rounded h-[80vh] overflow-y-auto">
        <h2 className="font-bold mb-2">Chapters</h2>

        <div>
          {chapters.map((c, i) => (
            <div key={c.chapter_id} className={`flex items-center justify-between p-1 ${c.chapter_id === currentChapterId ? "bg-gray-100" : ""}`}>
              <div className="flex-1">
                <button className="text-left w-full" onClick={() => setCurrentChapterId(c.chapter_id)}>
                  {c.title || "Untitled Chapter"}
                </button>
                <div className="text-xs text-gray-500">Words: {c.word_count || 0}</div>
              </div>
              <div className="flex gap-1 ml-2">
                <button className="button-sm" onClick={() => moveChapter(c.chapter_id, "up")} disabled={i === 0}>↑</button>
                <button className="button-sm" onClick={() => moveChapter(c.chapter_id, "down")} disabled={i === chapters.length - 1}>↓</button>
                <button className="button-sm text-red-600" onClick={() => handleDeleteChapter(c.chapter_id)}>Del</button>
              </div>
            </div>
          ))}
        </div>

        <button className="button-primary mt-2 w-full" onClick={handleCreateChapter}>
          + New Chapter
        </button>

        <div className="mt-4">
          <h3 className="font-semibold mb-1">Book Status</h3>
          <select value={bookStatus} onChange={(e) => updateBookStatus(e.target.value)} className="border p-2 rounded w-full">
            <option value="draft">Draft</option>
            <option value="in_progress">In Progress</option>
            <option value="published">Published</option>
          </select>
        </div>
      </div>

      <div className="flex-1">
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            placeholder="Chapter Title"
            value={title}
            onChange={(e) => updateTitle(e.target.value)}
            className="border p-2 rounded flex-1"
          />

          <div className="flex items-center gap-2">
            <button className="button" onClick={handlePreview} disabled={!currentChapterId}>Preview</button>
            <button
              className="button"
              onClick={async () => {
                if (!currentChapterId) return;
                await fetchVersions(currentChapterId);
                alert("Versions refreshed");
              }}
            >
              Refresh Versions
            </button>

            <div className="text-sm text-gray-600">{saveStatus === "saving" ? "Saving..." : saveStatus === "saved" ? "Saved" : saveStatus === "failed" ? "Save failed" : ""}</div>
          </div>
        </div>

        <div className="editor-container relative border p-2 min-h-[400px]" onMouseUp={handleMouseUp}>
          {currentChapterId && (
            <LexicalComposer
              key={editorKey}
              initialConfig={{
                namespace: `MyEditor_${story_id}_${currentChapterId}`,
                nodes: [ListNode, ListItemNode],
                onError: console.error,
                theme: { paragraph: "mb-2" },
                initialEditorState: initialEditorState(contentDelta),
              }}
            >
              <EditorToolbar />
              <RichTextPlugin contentEditable={<ContentEditable className="min-h-[300px] outline-none" />} placeholder={<div className="text-gray-400">Start writing...</div>} />
              <HistoryPlugin />
              <OnChangePlugin onChange={handleContentChange} />
              <ListPlugin />
            </LexicalComposer>
          )}

          <DictionaryTooltip word={selectedWord} position={tooltipPos} />
        </div>

        <div className="mt-3 text-sm text-gray-600">
          <div>Words: {wordCount}</div>
          <div>Chars: {charCount}</div>
          <div>Paragraphs: {paragraphs}</div>
          <div>Est. Minutes: {readingMinutes}</div>
        </div>

        <div className="mt-4">
          <h3 className="font-semibold">Versions</h3>
          <div className="space-y-1">
            {versions.length === 0 && <div className="text-xs text-gray-500">No versions</div>}
            {versions.map((v) => (
              <div key={v.version_id} className="flex items-center justify-between border rounded p-2">
                <div>
                  <div className="text-sm">{new Date(v.created_at).toLocaleString()}</div>
                  <div className="text-xs text-gray-500">Words: {v.word_count || 0}</div>
                </div>
                <div className="flex gap-2">
                  <button className="button-sm" onClick={() => handleRestoreVersion(v.version_id)}>Restore</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {showPreview && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-8" onClick={() => setShowPreview(false)}>
          <div className="bg-white border rounded shadow p-4 w-3/4 max-h-[80vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-semibold">Preview</h3>
              <button onClick={() => setShowPreview(false)}>Close</button>
            </div>
            <div dangerouslySetInnerHTML={{ __html: previewHtml || "<div>No preview</div>" }} />
          </div>
        </div>
      )}
    </div>
  );
}

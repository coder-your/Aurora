import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export default function BookCard({ book, onEdit, onDelete, onRestore, onEditDetails, onOpenMoodboard, className = "" }) {
  const totalChapters = book.total_chapters || 0;
  const completedChapters = book.completed_chapters || 0;
  const progressPercent = totalChapters ? Math.round((completedChapters / totalChapters) * 100) : 0;

  const statusLabel = (book.status || "draft").replace("_", " ");

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const portalRef = useRef(null);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    const handler = (e) => {
      const inButton = menuRef.current && menuRef.current.contains(e.target);
      const inPortal = portalRef.current && portalRef.current.contains(e.target);
      if (!inButton && !inPortal) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) return;

    const updatePosition = () => {
      const el = menuRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const menuWidth = 170;
      const left = Math.max(8, Math.min(window.innerWidth - menuWidth - 8, rect.right - menuWidth));
      const top = Math.min(window.innerHeight - 8, rect.bottom + 6);
      setMenuPos({ top, left });
    };

    updatePosition();

    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [menuOpen]);

  // Status badge colors
  const statusColors = {
    draft: { bg: "#E4DFDB", text: "#1A1A1A" },
    in_progress: { bg: "#e8c96e", text: "#1A1A1A" },
    published: { bg: "#2E7D66", text: "#fff" },
  };
  const statusStyle = statusColors[book.status] || statusColors.draft;

  return (
    <div 
      className={className}
      style={{
        backgroundColor: "#FFFFFF",
        borderRadius: "12px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        transition: "all 0.2s ease",
      }}
    >
      {/* Cover */}
      <div style={{ position: "relative", width: "100%", overflow: "visible" }}>
        <div style={{ position: "relative", width: "100%", paddingBottom: "140%", backgroundColor: "#E4DFDB", overflow: "hidden" }}>
          {book.cover_url ? (
            <img
              src={book.cover_url}
              alt={book.title || "Book cover"}
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", color: "#6b7280" }}>
              No cover
            </div>
          )}
          <span style={{
            position: "absolute",
            top: "8px",
            left: "8px",
            fontSize: "10px",
            textTransform: "uppercase",
            letterSpacing: "0.5px",
            padding: "4px 8px",
            borderRadius: "12px",
            backgroundColor: statusStyle.bg,
            color: statusStyle.text,
            fontWeight: "600",
          }}>
            {statusLabel}
          </span>
        </div>

        <div ref={menuRef} style={{ position: "absolute", top: 6, right: 6, zIndex: 60 }}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen((v) => !v);
            }}
            style={{
              width: 32,
              height: 32,
              borderRadius: 10,
              border: "1px solid rgba(0,0,0,0.08)",
              backgroundColor: "rgba(255,255,255,0.95)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 18,
              lineHeight: 1,
            }}
            aria-label="Book actions"
          >
            ⋯
          </button>
        </div>
      </div>

      {menuOpen &&
        createPortal(
          <div
            ref={portalRef}
            style={{
              position: "fixed",
              top: menuPos.top,
              left: menuPos.left,
              minWidth: 170,
              backgroundColor: "#fff",
              border: "1px solid rgba(0,0,0,0.08)",
              borderRadius: 12,
              boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
              overflow: "hidden",
              zIndex: 9999,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {!book.is_deleted && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onEditDetails && onEditDetails(book);
                  }}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: "10px 12px",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    fontSize: 13,
                  }}
                >
                  Edit details
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onEdit && onEdit(book.story_id);
                  }}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: "10px 12px",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    fontSize: 13,
                  }}
                >
                  Chapters
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onOpenMoodboard && onOpenMoodboard(book);
                  }}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: "10px 12px",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    fontSize: 13,
                  }}
                >
                  Moodboard
                </button>
                <div style={{ height: 1, backgroundColor: "rgba(0,0,0,0.06)" }} />
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onDelete && onDelete(book.story_id);
                  }}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: "10px 12px",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    fontSize: 13,
                    color: "#b91c1c",
                  }}
                >
                  Delete
                </button>
              </>
            )}

            {book.is_deleted && (
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onRestore && onRestore(book.story_id);
                }}
                style={{
                  width: "100%",
                  textAlign: "left",
                  padding: "10px 12px",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  fontSize: 13,
                  color: "#166534",
                }}
              >
                Restore
              </button>
            )}
          </div>,
          document.body
        )}

      {/* Info */}
      <div style={{ padding: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>
        <h3 style={{ fontSize: "14px", fontWeight: "600", color: "#1A1A1A", overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
          {book.title || "Untitled Book"}
        </h3>

        {/* Category Badge */}
        {book.category && (
          <span style={{
            display: "inline-block",
            padding: "3px 8px",
            fontSize: "10px",
            fontWeight: "500",
            backgroundColor: "#fff6d9",
            color: "#92710c",
            borderRadius: "4px",
            alignSelf: "flex-start",
          }}>
            {book.category}
          </span>
        )}

        {totalChapters > 0 && (
          <div style={{ fontSize: "11px", color: "#6b7280" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
              <span>{completedChapters}/{totalChapters} chapters</span>
              <span>{progressPercent}%</span>
            </div>
            <div style={{ width: "100%", backgroundColor: "#E4DFDB", height: "6px", borderRadius: "3px", overflow: "hidden" }}>
              <div style={{ backgroundColor: "#e8c96e", height: "6px", borderRadius: "3px", width: `${progressPercent}%` }}></div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

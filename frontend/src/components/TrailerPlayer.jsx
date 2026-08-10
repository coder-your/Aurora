import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import "../styles/bookTrailers.css";

const TrailerPlayer = ({ trailer }) => {
  const navigate = useNavigate();
  const [isHovering, setIsHovering] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [details, setDetails] = useState(trailer.story);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const videoUrl = `${import.meta.env.VITE_API_URL || "http://localhost:4000"}${trailer.video_url}`;

  const bookTitle = trailer.story?.title || "Unknown Book";

  const openBookDetails = async () => {
    setDetailsOpen(true);
    if (!trailer.story?.story_id) return;
    try {
      setDetailsLoading(true);
      const response = await api.get(`/api/books/${trailer.story.story_id}`);
      setDetails(response.data);
    } catch (error) {
      console.error("Error loading book details:", error);
    } finally {
      setDetailsLoading(false);
    }
  };

  return (
    <div 
      className="trailerCard"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <video
        src={videoUrl}
        crossOrigin="anonymous"
        controls
        className="trailerVideo"
        poster={trailer.story?.cover_url || undefined}
      >
        Your browser does not support the video tag.
      </video>

      <div className={`trailerOverlay ${isHovering ? 'trailerOverlayVisible' : ''}`}>
        <div className="trailerOverlayContent">
          <div className="trailerOverlayStack">
            <button
              onClick={openBookDetails}
              className="bookLinkButton"
            >
              <span className="text-lg">@</span>
              <span>{bookTitle}</span>
              <svg 
                className="bookLinkArrow" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            <div className="trailerOverlayMeta">
              <div>
                <span className="sourceOverlayBadge">
                  {trailer.source === "AI_GENERATED" ? "✨ AI Generated" : "🎬 Writer Uploaded"}
                </span>
              </div>

              {trailer.author && (
                <div className="authorOverlayBadge">
                  by {trailer.author.first_name} {trailer.author.last_name}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="durationBadge">
        {trailer.duration_seconds || 15}s
      </div>

      {detailsOpen && (
        <div className="trailerDrawerBackdrop" onClick={() => setDetailsOpen(false)}>
          <aside className="trailerDrawer" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="trailerDrawerClose" onClick={() => setDetailsOpen(false)} aria-label="Close book details">×</button>
            <p className="trailersKicker">Book details</p>
            <h2>{details?.title || bookTitle}</h2>
            <p className="trailerDrawerSummary">{detailsLoading ? "Loading the full story details..." : details?.description || "No summary is available for this book yet."}</p>
            <div className="trailerDrawerMeta">
              <span>{details?.chapters?.length || 0} chapters</span>
              <span>Trailer by {trailer.author?.first_name || "Aurora writer"}</span>
            </div>
            {details?.chapters?.length > 0 && (
              <div className="trailerChapterPreview">
                <h3>Chapter preview</h3>
                {details.chapters.slice(0, 3).map((chapter, index) => (
                  <div key={chapter.chapter_id || index}>
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <strong>{chapter.title || `Chapter ${index + 1}`}</strong>
                  </div>
                ))}
              </div>
            )}
            <button type="button" className="trailerStartReading" onClick={() => navigate(`/story/${trailer.story.story_id}`)}>
              Start Reading <span aria-hidden="true">→</span>
            </button>
          </aside>
        </div>
      )}
    </div>
  );
};

export default TrailerPlayer;

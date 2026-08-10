import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import trailerService from "../services/trailerService";

const TikTokVideoFeed = ({ onCreateClick, isWriter }) => {
  const [trailers, setTrailers] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [likes, setLikes] = useState({});
  const [saved, setSaved] = useState({});
  const videoRefs = useRef([]);
  const containerRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadTrailers();
  }, []);

  const loadTrailers = async () => {
    try {
      setLoading(true);
      const data = await trailerService.getAllTrailers();
      setTrailers(data);
      
      const initialLikes = {};
      const initialSaved = {};
      data.forEach(trailer => {
        initialLikes[trailer.trailer_id] = false;
        initialSaved[trailer.trailer_id] = false;
      });
      setLikes(initialLikes);
      setSaved(initialSaved);
    } catch (err) {
      console.error("Error loading trailers:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleLike = useCallback((trailerId) => {
    setLikes(prev => ({
      ...prev,
      [trailerId]: !prev[trailerId]
    }));
  }, []);

  const handleSave = useCallback((trailerId) => {
    setSaved(prev => ({
      ...prev,
      [trailerId]: !prev[trailerId]
    }));
  }, []);

  const handleShare = useCallback((trailer) => {
    if (navigator.share) {
      navigator.share({
        title: trailer.story?.title || "Book Trailer",
        text: `Check out this trailer for ${trailer.story?.title}!`,
        url: window.location.href
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert("Link copied to clipboard!");
    }
  }, []);

  const handleBookTagClick = useCallback((storyId) => {
    navigate(`/story/${storyId}`);
  }, [navigate]);

  const toggleMute = useCallback(() => {
    setIsMuted(prev => !prev);
  }, []);

  const scrollToNext = useCallback(() => {
    if (currentIndex < trailers.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  }, [currentIndex, trailers.length]);

  const scrollToPrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  }, [currentIndex]);

  useEffect(() => {
    videoRefs.current.forEach((video, index) => {
      if (video) {
        if (index === currentIndex) {
          video.play().catch(() => {});
        } else {
          video.pause();
          video.currentTime = 0;
        }
      }
    });
  }, [currentIndex]);

  useEffect(() => {
    const handleWheel = (e) => {
      if (e.deltaY > 0) {
        scrollToNext();
      } else if (e.deltaY < 0) {
        scrollToPrev();
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === "ArrowDown" || e.key === "ArrowRight") {
        scrollToNext();
      } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
        scrollToPrev();
      } else if (e.key === "m" || e.key === "M") {
        toggleMute();
      }
    };

    window.addEventListener("wheel", handleWheel);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [scrollToNext, scrollToPrev, toggleMute]);

  if (loading) {
    return (
      <div className="h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (trailers.length === 0) {
    return (
      <div className="h-screen bg-black flex flex-col items-center justify-center text-white">
        <div className="text-6xl mb-4">🎬</div>
        <h2 className="text-2xl font-bold mb-2">No Trailers Yet</h2>
        <p className="text-gray-400 mb-6">Be the first to create a book trailer!</p>
        {isWriter ? (
          <button
            onClick={onCreateClick}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full font-semibold hover:opacity-90 transition-opacity"
          >
            Create Trailer
          </button>
        ) : (
          <div className="text-center">
            <p className="text-gray-400 mb-4">Writers can create trailers</p>
            <button className="px-6 py-3 bg-gray-800 rounded-full font-semibold hover:bg-gray-700 transition-colors">
              Become a Writer
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="h-screen bg-black relative overflow-hidden" ref={containerRef}>
      <div className="h-full snap-y snap-mandatory overflow-y-scroll scroll-smooth">
        {trailers.map((trailer, index) => (
          <div
            key={trailer.trailer_id}
            className="h-full w-full snap-center flex items-center justify-center relative"
          >
            <video
              ref={el => videoRefs.current[index] = el}
              src={`${import.meta.env.VITE_API_URL || "http://localhost:4000"}${trailer.video_url}`}
              crossOrigin="anonymous"
              muted={isMuted}
              loop
              playsInline
              className="h-full w-full object-cover max-w-[500px]"
              poster={trailer.story?.cover_url || undefined}
            />

            {index === currentIndex && (
              <>
                {/* Sound Toggle Button */}
                <button
                  onClick={toggleMute}
                  className="absolute top-4 right-4 bg-black/50 backdrop-blur-md text-white p-3 rounded-full hover:bg-black/70 transition-colors z-20"
                >
                  {isMuted ? (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                    </svg>
                  ) : (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                    </svg>
                  )}
                </button>

                {/* Floating Action Bar */}
                <div className="absolute right-4 bottom-24 flex flex-col items-center gap-6 z-20">
                  {/* Author Profile */}
                  <div className="relative group">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 p-0.5">
                      <div className="w-full h-full rounded-full bg-gray-800 flex items-center justify-center text-white font-bold">
                        {trailer.author?.first_name?.charAt(0) || "A"}
                      </div>
                    </div>
                    <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-5 h-5 bg-purple-600 rounded-full flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </div>
                  </div>

                  {/* Like Button */}
                  <button
                    onClick={() => handleLike(trailer.trailer_id)}
                    className="flex flex-col items-center gap-1 group"
                  >
                    <div className={`w-12 h-12 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center transition-all duration-300 ${likes[trailer.trailer_id] ? 'scale-110' : ''}`}>
                      <svg
                        className={`w-7 h-7 transition-colors ${likes[trailer.trailer_id] ? 'text-red-500' : 'text-white'}`}
                        fill={likes[trailer.trailer_id] ? "currentColor" : "none"}
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                    </div>
                    <span className="text-white text-xs font-semibold">{likes[trailer.trailer_id] ? '1' : '0'}</span>
                  </button>

                  {/* Save/Bookmark Button */}
                  <button
                    onClick={() => handleSave(trailer.trailer_id)}
                    className="flex flex-col items-center gap-1 group"
                  >
                    <div className={`w-12 h-12 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center transition-all duration-300 ${saved[trailer.trailer_id] ? 'scale-110' : ''}`}>
                      <svg
                        className={`w-7 h-7 transition-colors ${saved[trailer.trailer_id] ? 'text-yellow-400' : 'text-white'}`}
                        fill={saved[trailer.trailer_id] ? "currentColor" : "none"}
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                      </svg>
                    </div>
                    <span className="text-white text-xs font-semibold">Save</span>
                  </button>

                  {/* Share Button */}
                  <button
                    onClick={() => handleShare(trailer)}
                    className="flex flex-col items-center gap-1 group"
                  >
                    <div className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center transition-all duration-300 group-hover:scale-110">
                      <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                      </svg>
                    </div>
                    <span className="text-white text-xs font-semibold">Share</span>
                  </button>
                </div>

                {/* Information Overlay */}
                <div className="absolute bottom-0 left-0 right-20 p-6 bg-gradient-to-t from-black/80 via-black/50 to-transparent">
                  <div className="flex flex-col gap-3">
                    {/* Writer Name */}
                    <div className="flex items-center gap-2">
                      <span className="text-white font-bold text-lg">
                        @{trailer.author?.first_name} {trailer.author?.last_name}
                      </span>
                    </div>

                    {/* @bookname Chip */}
                    <button
                      onClick={() => handleBookTagClick(trailer.story?.story_id)}
                      className="self-start bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-2 rounded-full text-sm font-semibold flex items-center gap-2 hover:opacity-90 transition-opacity shadow-lg"
                    >
                      <span>📖</span>
                      <span>@{trailer.story?.title || "Unknown Book"}</span>
                    </button>

                    {/* Caption */}
                    <p className="text-white/90 text-sm leading-relaxed line-clamp-2">
                      {trailer.story?.description || "Experience this amazing story through a cinematic trailer."}
                    </p>

                    {/* Audio Badge */}
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full">
                        <div className="flex gap-0.5">
                          {[...Array(3)].map((_, i) => (
                            <div
                              key={i}
                              className="w-1 h-4 bg-purple-500 rounded-full animate-pulse"
                              style={{ animationDelay: `${i * 0.1}s` }}
                            />
                          ))}
                        </div>
                        <span className="text-white text-xs">Original Sound</span>
                      </div>
                      <span className="text-white/60 text-xs">
                        {trailer.source === "AI_GENERATED" ? "✨ AI Generated" : "🎬 Writer Uploaded"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Create Trailer FAB */}
                {isWriter && (
                  <button
                    onClick={onCreateClick}
                    className="absolute top-4 left-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-2 rounded-full text-sm font-semibold flex items-center gap-2 hover:opacity-90 transition-opacity z-20 shadow-lg"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Create
                  </button>
                )}

                {/* Navigation Indicators */}
                <div className="absolute right-4 top-1/2 transform -translate-y-1/2 flex flex-col gap-2 z-10">
                  {trailers.map((_, index) => (
                    <div
                      key={index}
                      className={`w-1 rounded-full transition-all duration-300 ${
                        index === currentIndex ? 'h-8 bg-white' : 'h-2 bg-white/40'
                      }`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default TikTokVideoFeed;

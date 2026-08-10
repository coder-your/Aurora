import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import TrailerPlayer from "./TrailerPlayer";
import trailerService from "../services/trailerService";

const WatchTrailersTab = () => {
  const [trailers, setTrailers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadTrailers();
  }, []);

  const loadTrailers = async () => {
    try {
      setLoading(true);
      const data = await trailerService.getAllTrailers();
      setTrailers(data);
      setError(null);
    } catch (err) {
      console.error("Error loading trailers:", err);
      setError("Failed to load trailers");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={loadTrailers}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (trailers.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">🎬</div>
        <h3 className="text-xl font-semibold text-gray-700 mb-2">No Trailers Yet</h3>
        <p className="text-gray-500">Be the first to create a book trailer!</p>
      </div>
    );
  }

  return (
    <div className="trailerCollection">
      <div className="collectionHeading">
        <div>
          <p className="trailersKicker">The latest cuts</p>
          <h2>Watch trailers</h2>
        </div>
        <span>{trailers.length} trailers</span>
      </div>

      <div className="trailerMasonry">
        {trailers.map((trailer) => (
          <div key={trailer.trailer_id} className="trailerPin">
            <TrailerPlayer trailer={trailer} />
            <div className="pinDetails">
              <h3>
                {trailer.story?.story_id ? (
                    <Link to={`/story/${trailer.story.story_id}`}>
                    {trailer.story.title || "Untitled Book"}
                  </Link>
                ) : (
                  trailer.story?.title || "Untitled Book"
                )}
              </h3>
              
              {trailer.story?.description && (
                <p className="pinDescription">
                  {trailer.story.description}
                </p>
              )}

              <div className="pinMeta">
                <span>
                  {trailer.author?.user_id ? (
                    <Link to={`/writer/${trailer.author.user_id}`}>
                      {trailer.author.first_name} {trailer.author.last_name}
                    </Link>
                  ) : (
                    `${trailer.author?.first_name || ""} ${trailer.author?.last_name || ""}`.trim()
                  )}
                </span>
                <span className="sourceBadge">
                  {trailer.source === "AI_GENERATED" ? "AI Generated" : "Writer Uploaded"}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default WatchTrailersTab;

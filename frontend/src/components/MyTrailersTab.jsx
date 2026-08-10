import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import TrailerPlayer from "./TrailerPlayer";
import trailerService from "../services/trailerService";

const MyTrailersTab = () => {
  const [trailers, setTrailers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    loadTrailers();
  }, []);

  const loadTrailers = async () => {
    try {
      setLoading(true);
      const data = await trailerService.getUserTrailers();
      setTrailers(data);
      setError(null);
    } catch (err) {
      console.error("Error loading your trailers:", err);
      setError("Failed to load your trailers");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (trailerId) => {
    if (!window.confirm("Are you sure you want to delete this trailer? This action cannot be undone.")) {
      return;
    }

    try {
      setDeletingId(trailerId);
      await trailerService.deleteTrailer(trailerId);
      setTrailers(trailers.filter(t => t.trailer_id !== trailerId));
    } catch (err) {
      console.error("Error deleting trailer:", err);
      setError(err.response?.data?.message || "Failed to delete trailer");
    } finally {
      setDeletingId(null);
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
        <p className="text-gray-500">Create your first book trailer to get started!</p>
      </div>
    );
  }

  return (
    <div className="trailerCollection">
      <div className="collectionHeading">
        <div>
          <p className="trailersKicker">Your studio</p>
          <h2>My trailers</h2>
        </div>
        <span>{trailers.length} trailers</span>
      </div>

      <div className="trailerMasonry">
        {trailers.map((trailer) => (
          <div key={trailer.trailer_id} className="trailerPin">
            {trailer.status === "completed" && <TrailerPlayer trailer={trailer} />}
            
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

              <div className="pinMeta pinStatusRow">
                <span className={`statusBadge status-${trailer.status}`}>
                  {trailer.status === "completed" 
                    ? "Completed" 
                    : trailer.status === "processing"
                    ? "Processing"
                    : "Failed"}
                </span>
                <span className="sourceBadge">
                  {trailer.source === "AI_GENERATED" ? "AI Generated" : "Writer Uploaded"}
                </span>
              </div>

              <button
                onClick={() => handleDelete(trailer.trailer_id)}
                disabled={deletingId === trailer.trailer_id || trailer.status === "processing"}
                className="deleteTrailerButton"
                title="Delete trailer"
                aria-label={`Delete ${trailer.story?.title || "trailer"}`}
              >
                {deletingId === trailer.trailer_id ? "Deleting..." : "Delete Trailer"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MyTrailersTab;
import React, { useState, useEffect, useRef } from "react";
import trailerService from "../services/trailerService";
import { getUserStories } from "../services/bookService";

const CreateTrailerTab = ({ isWriter }) => {
  const [activeTab, setActiveTab] = useState("ai");
  const [stories, setStories] = useState([]);
  const [selectedStory, setSelectedStory] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [videoFile, setVideoFile] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [trailerId, setTrailerId] = useState(null);
  const [caption, setCaption] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredStories, setFilteredStories] = useState([]);
  const [aiLimit, setAiLimit] = useState({ limit: 3, used: 0, remaining: 3 });
  const autocompleteRef = useRef(null);

  useEffect(() => {
    if (isWriter) {
      loadUserStories();
      loadAILimit();
    }
  }, [isWriter]);

  const loadAILimit = async () => {
    try {
      const data = await trailerService.getAITrailerLimit();
      setAiLimit(data);
    } catch (err) {
      console.error("Error loading AI trailer limit:", err);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (autocompleteRef.current && !autocompleteRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const loadUserStories = async () => {
    try {
      const data = await getUserStories();
      setStories(data);
    } catch (err) {
      console.error("Error loading stories:", err);
      setError("Failed to load your stories");
    }
  };

  const handleCaptionChange = (e) => {
    const value = e.target.value;
    setCaption(value);

    const lastAtIndex = value.lastIndexOf("@");
    if (lastAtIndex !== -1) {
      const searchTerm = value.slice(lastAtIndex + 1).toLowerCase();
      const filtered = stories.filter(
        (story) =>
          story.title &&
          story.title.toLowerCase().includes(searchTerm) &&
          story.story_id !== parseInt(selectedStory)
      );
      setFilteredStories(filtered);
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  };

  const handleStorySelect = (story) => {
    const lastAtIndex = caption.lastIndexOf("@");
    const beforeAt = caption.slice(0, lastAtIndex);
    
    setCaption(`${beforeAt}@${story.title} `);
    setSelectedStory(story.story_id.toString());
    setShowSuggestions(false);
  };

  const handleAIGenerate = async () => {
    if (!selectedStory) {
      setError("Please select a story first");
      return;
    }

    if (aiLimit.remaining <= 0) {
      setError(`You have reached your AI trailer generation limit (${aiLimit.limit}). Please upgrade your plan for more.`);
      return;
    }

    try {
      setGenerating(true);
      setError(null);
      setSuccess(null);

      const result = await trailerService.createTrailerAI(selectedStory);
      setTrailerId(result.trailer_id);
      setSuccess("Trailer generation started! This may take a few minutes.");
      
      // Refresh the AI limit
      await loadAILimit();

      if (result.status === "processing") {
        pollTrailerStatus(result.trailer_id);
      }
    } catch (err) {
      console.error("Error generating trailer:", err);
      setError(err.response?.data?.message || "Failed to generate trailer");
    } finally {
      setGenerating(false);
    }
  };

  const pollTrailerStatus = async (id) => {
    const interval = setInterval(async () => {
      try {
        const status = await trailerService.getTrailerStatus(id);
        if (status.status === "completed") {
          clearInterval(interval);
          setSuccess("Trailer generated successfully!");
          setTrailerId(null);
        } else if (status.status === "failed") {
          clearInterval(interval);
          setError("Trailer generation failed. Please try again.");
          setTrailerId(null);
        }
      } catch (err) {
        console.error("Error polling status:", err);
        clearInterval(interval);
      }
    }, 5000);
  };

  const handleFileUpload = async (e) => {
    e.preventDefault();

    if (!selectedStory) {
      setError("Please select a story first");
      return;
    }

    if (!videoFile) {
      setError("Please select a video file");
      return;
    }

    if (videoFile.size > 50 * 1024 * 1024) {
      setError("Video file must be less than 50MB");
      return;
    }

    try {
      setUploading(true);
      setError(null);
      setSuccess(null);

      await trailerService.uploadTrailer(selectedStory, videoFile);
      setSuccess("Trailer uploaded successfully!");
      setVideoFile(null);
      setSelectedStory("");
    } catch (err) {
      console.error("Error uploading trailer:", err);
      setError(err.response?.data?.message || "Failed to upload trailer");
    } finally {
      setUploading(false);
    }
  };

  const handleVideoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.type !== "video/mp4" && !file.name.toLowerCase().endsWith(".mp4")) {
      setError("Please select an MP4 video file.");
      setVideoFile(null);
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      setError("Video file must be less than 50MB");
      setVideoFile(null);
      return;
    }

    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(video.src);
      if (video.duration < 5 || video.duration > 15) {
        setError("Video must be between 5 and 15 seconds.");
        setVideoFile(null);
        return;
      }
      setError(null);
      setVideoFile(file);
    };
    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      setError("Could not read this video file.");
      setVideoFile(null);
    };
    video.src = URL.createObjectURL(file);
  };

  if (!isWriter) {
    return (
      <div className="text-center py-16">
        <div className="text-6xl mb-4">✍️</div>
        <h3 className="text-2xl font-bold text-gray-800 mb-3">Writer Access Required</h3>
        <p className="text-gray-600 mb-6 max-w-md mx-auto">
          Only writers can create book trailers. Upgrade your profile to start creating amazing trailers for your stories!
        </p>
        <button className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium">
          Become a Writer
        </button>
      </div>
    );
  }

  return (
    <div className="trailerCreator">
      <div className="creatorIntro">
        <div>
          <p className="trailersKicker">Make a moment</p>
          <h2>Bring your story to the screen</h2>
          <p>Choose a published story, then let Aurora shape a cinematic preview or upload your own cut.</p>
        </div>
        <span className="limitBadge">{aiLimit.remaining} / {aiLimit.limit} AI generations left</span>
      </div>
      <div className="creatorTabs">
        <button
          onClick={() => setActiveTab("ai")}
          className={`creatorTab ${activeTab === "ai" ? "creatorTabActive" : ""}`}
        >
          AI generation
        </button>
        <button
          onClick={() => setActiveTab("upload")}
          className={`creatorTab ${activeTab === "upload" ? "creatorTabActive" : ""}`}
        >
          Custom upload
        </button>
      </div>

      <div className="creatorPanel">
        <div className="storyPicker">
          <label>
            Select Your Story
          </label>
          <select
            value={selectedStory}
            onChange={(e) => setSelectedStory(e.target.value)}
            className="creatorSelect"
          >
            <option value="">Choose a story...</option>
            {stories.map((story) => (
              <option key={story.story_id} value={story.story_id}>
                {story.title || "Untitled"}
              </option>
            ))}
          </select>
          <p className="fieldHint">
            Only showing your published stories
          </p>
        </div>

        {activeTab === "ai" ? (
          <div className="creatorOptionStack">
            <div className="optionCard optionCardAi">
              <h4>AI-powered generation</h4>
              <p>
                Our AI will automatically generate a cinematic 15-second trailer using your story's description,
                complete with stock footage, voiceover, and an interactive @{selectedStory ? stories.find(s => s.story_id === parseInt(selectedStory))?.title : "BookTitle"} tag.
              </p>
              <div className="optionMeta">
                <span>Monthly allowance</span>
                <span className={aiLimit.remaining <= 0 ? 'limitEmpty' : ''}>
                  {aiLimit.remaining} / {aiLimit.limit}
                </span>
              </div>
            </div>

            <button
              onClick={handleAIGenerate}
              disabled={generating || !selectedStory || aiLimit.remaining <= 0}
              className="primaryTrailerButton"
            >
              {generating ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Generating Trailer...
                </>
              ) : aiLimit.remaining <= 0 ? (
                "Limit Reached"
              ) : (
                "Generate Trailer with AI"
              )}
            </button>

            {trailerId && (
              <div className="trailerProgressPanel">
                <div className="trailerPulseRing" aria-hidden="true" />
                <div>
                  <p className="trailerProgressTitle">Your trailer is taking shape</p>
                  <p className="trailerProgressText">Gemini is shaping the story while Pexels and FFmpeg build the cut.</p>
                  <div className="trailerProgressTrack" aria-label="Trailer generation in progress">
                    <span />
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={handleFileUpload} className="uploadForm">
            <div className="optionCard optionCardUpload">
              <h4>Custom upload</h4>
              <p>
                Upload your own 15-second .mp4 trailer. Maximum file size: 50MB.
              </p>
              <p className="fieldHint">
                Select your book above to attach the clickable @bookname tag.
              </p>
            </div>

            <div className="relative" ref={autocompleteRef}>
              <label className="fieldLabel">
                Caption (optional - type @ to tag your book)
              </label>
              <input
                type="text"
                value={caption}
                onChange={handleCaptionChange}
                placeholder="Add a caption... type @ to tag your book"
                className="creatorInput"
              />
              
              {showSuggestions && filteredStories.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {filteredStories.map((story) => (
                    <div
                      key={story.story_id}
                      onClick={() => handleStorySelect(story)}
                      className="px-4 py-2 hover:bg-purple-50 cursor-pointer flex items-center gap-2"
                    >
                      <span className="text-purple-600">@</span>
                      <span>{story.title || "Untitled"}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="fieldLabel">
                Video File (.mp4 only, 5 to 15 seconds)
              </label>
              <input
                type="file"
                accept=".mp4"
                onChange={handleVideoChange}
                className="creatorFileInput"
              />
              <p className="mt-1 text-xs text-gray-500">MP4 files only</p>
              {videoFile && (
                <p className="selectedFile">
                  Selected: {videoFile.name} ({(videoFile.size / 1024 / 1024).toFixed(2)} MB)
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={uploading || !selectedStory || !videoFile}
              className="primaryTrailerButton"
            >
              {uploading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Uploading...
                </>
              ) : (
                "Upload Trailer"
              )}
            </button>
          </form>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-sm text-green-700">{success}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CreateTrailerTab;

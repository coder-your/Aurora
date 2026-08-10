import React, { useState, useEffect, useRef } from "react";
import trailerService from "../services/trailerService";
import { getUserStories } from "../services/bookService";

const CreateTrailerWizard = ({ isOpen, onClose, isWriter }) => {
  const [step, setStep] = useState(1);
  const [stories, setStories] = useState([]);
  const [selectedStory, setSelectedStory] = useState("");
  const [creationMethod, setCreationMethod] = useState("");
  const [videoFile, setVideoFile] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [trailerId, setTrailerId] = useState(null);
  const [caption, setCaption] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredStories, setFilteredStories] = useState([]);
  const [aiLimit, setAiLimit] = useState({ limit: 3, used: 0, remaining: 3 });
  const autocompleteRef = useRef(null);

  useEffect(() => {
    if (isOpen && isWriter) {
      loadUserStories();
      loadAILimit();
    }
  }, [isOpen, isWriter]);

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
      setSuccess("Trailer generation started!");
      setStep(4);
      
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
        } else if (status.status === "failed") {
          clearInterval(interval);
          setError("Trailer generation failed. Please try again.");
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
      setStep(4);
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

  const resetWizard = () => {
    setStep(1);
    setSelectedStory("");
    setCreationMethod("");
    setVideoFile(null);
    setError(null);
    setSuccess(null);
    setTrailerId(null);
    setCaption("");
  };

  const handleClose = () => {
    resetWizard();
    onClose();
  };

  if (!isOpen) return null;

  if (!isWriter) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-gradient-to-br from-purple-900/90 to-pink-900/90 backdrop-blur-xl rounded-3xl p-8 max-w-md w-full text-white border border-white/20 shadow-2xl">
          <div className="text-center">
            <div className="text-6xl mb-4">✍️</div>
            <h3 className="text-3xl font-bold mb-3">Writer Access Required</h3>
            <p className="text-purple-100 mb-6 text-lg">
              Only writers can create book trailers. Upgrade your profile to start creating amazing trailers for your stories!
            </p>
            <button
              onClick={handleClose}
              className="w-full px-6 py-4 bg-white text-purple-900 rounded-xl font-bold hover:bg-purple-50 transition-colors"
            >
              Become a Writer
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 backdrop-blur-xl rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-700 shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-gray-900/95 backdrop-blur-xl border-b border-gray-700 p-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">Create Trailer</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Progress Steps */}
        <div className="px-6 pt-6">
          <div className="flex items-center justify-between mb-8">
            {[1, 2, 3, 4].map((s) => (
              <React.Fragment key={s}>
                <div className="flex flex-col items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all ${step >= s ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white" : "bg-gray-700 text-gray-400"}`}>
                    {step > s ? "✓" : s}
                  </div>
                  <span className={`text-xs mt-2 ${step >= s ? "text-white" : "text-gray-500"}`}>
                    {s === 1 ? "Select" : s === 2 ? "Method" : s === 3 ? "Create" : "Done"}
                  </span>
                </div>
                {s < 4 && (
                  <div
                    className={`flex-1 h-1 mx-2 rounded-full ${
                      step > s ? "bg-gradient-to-r from-purple-600 to-pink-600" : "bg-gray-700"
                    }`}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <label className="block text-white font-medium mb-3 text-lg">
                  Select Your Story
                </label>
                <select
                  value={selectedStory}
                  onChange={(e) => setSelectedStory(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-xl text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                >
                  <option value="">Choose a story...</option>
                  {stories.map((story) => (
                    <option key={story.story_id} value={story.story_id}>
                      {story.title || "Untitled"}
                    </option>
                  ))}
                </select>
                <p className="mt-2 text-sm text-gray-400">
                  Only showing your published stories
                </p>
              </div>

              <button
                onClick={() => selectedStory && setStep(2)}
                disabled={!selectedStory}
                className="w-full px-6 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-bold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div>
                <label className="block text-white font-medium mb-4 text-lg">
                  Choose Creation Method
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button
                    onClick={() => setCreationMethod("ai")}
                    className={`p-6 rounded-xl border-2 transition-all ${
                      creationMethod === "ai"
                        ? "border-purple-500 bg-purple-500/20"
                        : "border-gray-700 bg-gray-800 hover:border-gray-600"
                    }`}
                  >
                    <div className="text-4xl mb-3">✨</div>
                    <h3 className="text-white font-bold mb-2">AI Generate</h3>
                    <p className="text-gray-400 text-sm">
                      Let AI create a cinematic trailer with stock footage and voiceover
                    </p>
                  </button>

                  <button
                    onClick={() => setCreationMethod("upload")}
                    className={`p-6 rounded-xl border-2 transition-all ${
                      creationMethod === "upload"
                        ? "border-purple-500 bg-purple-500/20"
                        : "border-gray-700 bg-gray-800 hover:border-gray-600"
                    }`}
                  >
                    <div className="text-4xl mb-3">🎬</div>
                    <h3 className="text-white font-bold mb-2">Upload Video</h3>
                    <p className="text-gray-400 text-sm">
                      Upload your own 15-second .mp4 trailer
                    </p>
                  </button>
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 px-6 py-4 bg-gray-700 text-white rounded-xl font-bold hover:bg-gray-600 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={() => creationMethod && setStep(3)}
                  disabled={!creationMethod}
                  className="flex-1 px-6 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-bold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              {creationMethod === "ai" ? (
                <div className="space-y-6">
                  <div className="bg-purple-500/20 border border-purple-500/50 rounded-xl p-6">
                    <h4 className="text-white font-bold mb-3 flex items-center gap-2">
                      <span className="text-2xl">✨</span>
                      AI-Powered Generation
                    </h4>
                    <p className="text-purple-100 mb-4">
                      Our AI will generate a cinematic 15-second trailer using your story's description,
                      complete with stock footage, voiceover, and an interactive @{selectedStory ? stories.find(s => s.story_id === parseInt(selectedStory))?.title : "BookTitle"} tag.
                    </p>
                    <div className="flex items-center justify-between text-sm text-purple-200 mb-2">
                      <span>AI Generations Remaining:</span>
                      <span className={`font-bold ${aiLimit.remaining <= 0 ? 'text-red-300' : 'text-white'}`}>
                        {aiLimit.remaining} / {aiLimit.limit}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-purple-200">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      This may take a few minutes
                    </div>
                  </div>

                  <button
                    onClick={handleAIGenerate}
                    disabled={generating || aiLimit.remaining <= 0}
                    className="w-full px-6 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-bold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
                </div>
              ) : (
                <form onSubmit={handleFileUpload} className="space-y-6">
                  <div className="bg-blue-500/20 border border-blue-500/50 rounded-xl p-6">
                    <h4 className="text-white font-bold mb-3 flex items-center gap-2">
                      <span className="text-2xl">🎬</span>
                      Manual Upload
                    </h4>
                    <p className="text-blue-100 mb-2">
                      Upload your own 15-second .mp4 trailer. Maximum file size: 50MB.
                    </p>
                    <p className="text-blue-200 text-xs">
                      Type @ in the caption to tag your book for the interactive overlay.
                    </p>
                  </div>

                  <div className="relative" ref={autocompleteRef}>
                    <label className="block text-white font-medium mb-2">
                      Caption (optional)
                    </label>
                    <input
                      type="text"
                      value={caption}
                      onChange={handleCaptionChange}
                      placeholder="Add a caption... type @ to tag your book"
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-xl text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                    />
                    
                    {showSuggestions && filteredStories.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-gray-800 border border-gray-700 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                        {filteredStories.map((story) => (
                          <div
                            key={story.story_id}
                            onClick={() => handleStorySelect(story)}
                            className="px-4 py-3 hover:bg-purple-500/20 cursor-pointer flex items-center gap-2 text-white"
                          >
                            <span className="text-purple-400">@</span>
                            <span>{story.title || "Untitled"}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-white font-medium mb-2">
                      Video File (.mp4 only, 5 to 15 seconds)
                    </label>
                    <div className="border-2 border-dashed border-gray-600 rounded-xl p-8 text-center hover:border-purple-500 transition-colors">
                      <input
                        type="file"
                        accept=".mp4"
                        onChange={handleVideoChange}
                        className="hidden"
                        id="video-upload"
                      />
                      <label
                        htmlFor="video-upload"
                        className="cursor-pointer"
                      >
                        <div className="text-4xl mb-3">📁</div>
                        <p className="text-gray-400 mb-2">
                          {videoFile ? videoFile.name : "Click to upload or drag and drop"}
                        </p>
                        <p className="text-xs text-gray-500 mb-2">MP4 files only</p>
                        {videoFile && (
                          <p className="text-sm text-purple-400">
                            {(videoFile.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        )}
                      </label>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={uploading || !videoFile}
                    className="w-full px-6 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-bold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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

              <button
                onClick={() => setStep(2)}
                className="w-full px-6 py-4 bg-gray-700 text-white rounded-xl font-bold hover:bg-gray-600 transition-colors"
              >
                Back
              </button>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6 text-center">
              <div className="text-6xl mb-4">🎉</div>
              <h3 className="text-3xl font-bold text-white mb-3">
                {success || "Trailer Created!"}
              </h3>
              <p className="text-gray-400 mb-6">
                Your trailer is now live and ready to be discovered by readers!
              </p>

              {trailerId && (
                <div className="bg-blue-500/20 border border-blue-500/50 rounded-xl p-4 mb-6">
                  <p className="text-blue-100 text-sm">
                    <span className="font-medium">Processing:</span> Your trailer is being generated.
                    You can leave this page and check back later.
                  </p>
                </div>
              )}

              <button
                onClick={handleClose}
                className="w-full px-6 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-bold hover:opacity-90 transition-opacity"
              >
                Done
              </button>
            </div>
          )}

          {error && (
            <div className="mt-6 bg-red-500/20 border border-red-500/50 rounded-xl p-4">
              <p className="text-red-100 text-sm">{error}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreateTrailerWizard;

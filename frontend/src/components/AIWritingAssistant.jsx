import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  getCapabilities,
  getAIUsage,
  requestAIAssistance,
} from "../services/aiAssistantService";
import styles from "../styles/aiAssistant.module.css";

const CATEGORIES = {
  Structure: { icon: "📐", color: "#60a5fa" },
  Characters: { icon: "👤", color: "#f472b6" },
  Style: { icon: "✨", color: "#a78bfa" },
  Story: { icon: "📖", color: "#fbbf24" },
  World: { icon: "🌍", color: "#4ade80" },
  General: { icon: "💡", color: "#94a3b8" },
};

const TONE_OPTIONS = [
  { value: "dark", label: "Dark & Gritty" },
  { value: "romantic", label: "Romantic" },
  { value: "suspenseful", label: "Suspenseful" },
  { value: "horror", label: "Horror" },
  { value: "dramatic", label: "Dramatic" },
  { value: "comedic", label: "Comedic" },
  { value: "poetic", label: "Poetic" },
  { value: "melancholic", label: "Melancholic" },
];

const EMOTION_OPTIONS = [
  { value: "sadness", label: "Sadness" },
  { value: "fear", label: "Fear" },
  { value: "anger", label: "Anger" },
  { value: "love", label: "Love" },
  { value: "tension", label: "Tension" },
  { value: "grief", label: "Grief" },
  { value: "regret", label: "Regret" },
  { value: "excitement", label: "Excitement" },
];

const READING_LEVEL_OPTIONS = [
  { value: "simple", label: "Simpler & More Accessible" },
  { value: "advanced", label: "More Advanced & Complex" },
];

const THEME_OPTIONS = [
  { value: "revenge", label: "Revenge" },
  { value: "friendship", label: "Friendship" },
  { value: "sacrifice", label: "Sacrifice" },
  { value: "corruption", label: "Corruption" },
  { value: "survival", label: "Survival" },
  { value: "redemption", label: "Redemption" },
  { value: "identity", label: "Identity" },
];

const RELATIONSHIP_OPTIONS = [
  { value: "romance", label: "Romance" },
  { value: "friendship", label: "Friendship" },
  { value: "rivalry", label: "Rivalry" },
  { value: "family", label: "Family" },
  { value: "mentor", label: "Mentor-Student" },
  { value: "enemies", label: "Enemies" },
];

export default function AIWritingAssistant({ storyId, onInsertText, selectedText }) {
  const [isOpen, setIsOpen] = useState(false);
  const [capabilities, setCapabilities] = useState([]);
  const [usage, setUsage] = useState(null);
  const [selectedCapability, setSelectedCapability] = useState(null);
  const [context, setContext] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("assistant");
  
  // Options for capabilities that need them
  const [tone, setTone] = useState("dark");
  const [emotion, setEmotion] = useState("sadness");
  const [target, setTarget] = useState("simple");
  const [theme, setTheme] = useState("revenge");
  const [relationship, setRelationship] = useState("romance");
  const [characterInfo, setCharacterInfo] = useState("");
  const [storyContext, setStoryContext] = useState("");

  const responseRef = useRef(null);

  const loadCapabilities = useCallback(async () => {
    try {
      const res = await getCapabilities();
      setCapabilities(res.data?.capabilities || []);
    } catch (err) {
      console.error("Failed to load AI capabilities:", err);
    }
  }, []);

  const loadUsage = useCallback(async () => {
    try {
      const res = await getAIUsage(storyId);
      setUsage(res.data);
    } catch (err) {
      console.error("Failed to load AI usage:", err);
    }
  }, [storyId]);

  // Load capabilities and usage on mount
  useEffect(() => {
    if (storyId && isOpen) {
      loadCapabilities();
      loadUsage();
    }
  }, [storyId, isOpen, loadCapabilities, loadUsage]);

  // Update context when selectedText changes
  useEffect(() => {
    if (selectedText) {
      setContext(selectedText);
    }
  }, [selectedText]);

  const handleCapabilitySelect = (cap) => {
    setSelectedCapability(cap);
    setResult(null);
    setError(null);
    
    // Auto-set context if empty and we have selected text
    if (!context && selectedText) {
      setContext(selectedText);
    }
  };

  const handleSubmit = async () => {
    if (!selectedCapability || !context.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const payload = {
        capability: selectedCapability.key,
        context: context.trim(),
      };
      console.log("[Frontend] Sending AI request:", { storyId, payload });

      // Add optional parameters based on capability
      if (selectedCapability.key === "tone_enhancement") {
        payload.tone = tone;
      } else if (selectedCapability.key === "emotion_enhancement") {
        payload.emotion = emotion;
      } else if (selectedCapability.key === "reading_level") {
        payload.target = target;
      } else if (selectedCapability.key === "theme") {
        payload.theme = theme;
      } else if (selectedCapability.key === "relationship") {
        payload.relationship = relationship;
      } else if (selectedCapability.key === "character_consistency") {
        payload.characterInfo = characterInfo;
      } else if (selectedCapability.key === "plot_hole") {
        payload.storyContext = storyContext;
      }

      const res = await requestAIAssistance(storyId, payload);
      
      if (res.data?.success) {
        setResult(res.data);
        setUsage(res.data.turns);
      } else {
        setError(res.data?.message || "AI assistant request failed");
        if (res.data?.turns) {
          setUsage(res.data.turns);
        }
      }
    } catch (err) {
      console.error("AI assistance error:", err);
      console.log("Error response data:", err.response?.data);
      const errorMsg = err.response?.data?.message || err.response?.data?.error || "Failed to get AI assistance";
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleInsert = (text) => {
    if (onInsertText && text) {
      onInsertText(text);
    }
  };

  const getCapabilityOptions = () => {
    if (!selectedCapability) return null;

    switch (selectedCapability.key) {
      case "tone_enhancement":
        return (
          <div className={styles.optionGroup}>
            <label>Target Tone</label>
            <select value={tone} onChange={(e) => setTone(e.target.value)}>
              {TONE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        );
      case "emotion_enhancement":
        return (
          <div className={styles.optionGroup}>
            <label>Target Emotion</label>
            <select value={emotion} onChange={(e) => setEmotion(e.target.value)}>
              {EMOTION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        );
      case "reading_level":
        return (
          <div className={styles.optionGroup}>
            <label>Adjust To</label>
            <select value={target} onChange={(e) => setTarget(e.target.value)}>
              {READING_LEVEL_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        );
      case "theme":
        return (
          <div className={styles.optionGroup}>
            <label>Theme to Reinforce</label>
            <select value={theme} onChange={(e) => setTheme(e.target.value)}>
              {THEME_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        );
      case "relationship":
        return (
          <div className={styles.optionGroup}>
            <label>Relationship Type</label>
            <select value={relationship} onChange={(e) => setRelationship(e.target.value)}>
              {RELATIONSHIP_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        );
      case "character_consistency":
        return (
          <div className={styles.optionGroup}>
            <label>Established Character Traits</label>
            <textarea
              value={characterInfo}
              onChange={(e) => setCharacterInfo(e.target.value)}
              placeholder="E.g., Character: Sarah, Traits: brave, impulsive, afraid of heights, protective of younger sister"
              rows={3}
            />
          </div>
        );
      case "plot_hole":
        return (
          <div className={styles.optionGroup}>
            <label>Story Context (Timeline, Rules, Events)</label>
            <textarea
              value={storyContext}
              onChange={(e) => setStoryContext(e.target.value)}
              placeholder="E.g., Story takes place over 3 days. Magic system: fire mages can't use water. Character A died in chapter 3."
              rows={3}
            />
          </div>
        );
      default:
        return null;
    }
  };

  const groupCapabilitiesByCategory = () => {
    const grouped = {};
    capabilities.forEach((cap) => {
      if (!grouped[cap.category]) {
        grouped[cap.category] = [];
      }
      grouped[cap.category].push(cap);
    });
    return grouped;
  };

  const renderAssistantPanel = () => {
    const groupedCapabilities = groupCapabilitiesByCategory();

    return (
      <div className={styles.assistantPanel}>
        {!selectedCapability ? (
          <div className={styles.capabilitiesGrid}>
            <h4>Select an AI Assistant Capability</h4>
            {Object.entries(groupedCapabilities).map(([category, caps]) => (
              <div key={category} className={styles.categorySection}>
                <div className={styles.categoryHeader}>
                  <span style={{ color: CATEGORIES[category]?.color }}>
                    {CATEGORIES[category]?.icon}
                  </span>
                  <span>{category}</span>
                </div>
                <div className={styles.capabilityButtons}>
                  {caps.map((cap) => (
                    <button
                      key={cap.key}
                      className={styles.capabilityBtn}
                      onClick={() => handleCapabilitySelect(cap)}
                    >
                      {cap.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.inputPanel}>
            <button
              className={styles.backBtn}
              onClick={() => setSelectedCapability(null)}
            >
              ← Back to capabilities
            </button>

            <div className={styles.selectedCapability}>
              <span style={{ color: CATEGORIES[selectedCapability.category]?.color }}>
                {CATEGORIES[selectedCapability.category]?.icon}
              </span>
              <span>{selectedCapability.label}</span>
            </div>

            {getCapabilityOptions()}

            <div className={styles.contextInput}>
              <label>
                Context / Text to Work With
                {selectedText && (
                  <span className={styles.preFilled}> (pre-filled from selection)</span>
                )}
              </label>
              <textarea
                value={context}
                onChange={(e) => setContext(e.target.value)}
                placeholder="Enter your text, scene summary, or writing context here..."
                rows={6}
              />
              <div className={styles.contextHelp}>
                {selectedCapability.key === "opening_line" && "Tip: Briefly describe the scene or chapter you want to start."}
                {selectedCapability.key === "scene_continuation" && "Tip: Paste what you've written so far."}
                {selectedCapability.key === "ending_assistance" && "Tip: Describe where the scene/chapter currently stands."}
                {selectedCapability.key === "character_description" && "Tip: Name the character and key traits you want to convey."}
                {selectedCapability.key === "dialogue_improvement" && "Tip: Paste the dialogue exchange that feels off."}
                {selectedCapability.key === "writers_block" && "Tip: Describe your current scene and where you're stuck."}
              </div>
            </div>

            <button
              className={styles.submitBtn}
              onClick={handleSubmit}
              disabled={loading || !context.trim()}
            >
              {loading ? "Thinking..." : "Get AI Suggestions"}
            </button>

            {loading && (
              <div className={styles.loadingIndicator}>
                <div className={styles.spinner}></div>
                <span>The AI is crafting suggestions...</span>
              </div>
            )}

            {error && (
              <div className={styles.errorMessage}>
                <span>⚠️</span> {error}
              </div>
            )}

            {result && (
              <div className={styles.resultPanel} ref={responseRef}>
                <div className={styles.resultHeader}>
                  <span>✨ AI Suggestions</span>
                  <span className={styles.wordCount}>{result.wordCount} words</span>
                </div>
                <div className={styles.responseText}>
                  {result.response.split("\n").map((paragraph, idx) => (
                    <p key={idx}>{paragraph}</p>
                  ))}
                </div>
                <div className={styles.resultActions}>
                  <button
                    className={styles.insertBtn}
                    onClick={() => handleInsert(result.response)}
                  >
                    Insert into Editor
                  </button>
                  <button
                    className={styles.copyBtn}
                    onClick={() => navigator.clipboard.writeText(result.response)}
                  >
                    Copy to Clipboard
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderUsagePanel = () => {
    if (!usage) return <div className={styles.loading}>Loading...</div>;

    return (
      <div className={styles.usagePanel}>
        <div className={styles.usageHeader}>
          <h4>AI Assistant Usage</h4>
          <div className={usage.locked ? styles.turnsLocked : styles.turnsAvailable}>
            <span className={styles.turnsCount}>
              {usage.remaining}/{usage.limit}
            </span>
            <span className={styles.turnsLabel}>turns remaining</span>
          </div>
        </div>

        {usage.locked ? (
          <div className={styles.lockedMessage}>
            <span>🔒</span>
            <p>
              You've used all {usage.limit} AI assistance turns for this book.
              Starting a new book will reset your AI turns.
            </p>
          </div>
        ) : (
          <p className={styles.usageInfo}>
            Each AI request uses 1 turn. You have {usage.remaining} turns remaining for this book.
          </p>
        )}

        {usage.history && usage.history.length > 0 && (
          <div className={styles.historyList}>
            <h5>Recent AI Usage</h5>
            {usage.history.map((item) => (
              <div key={item.id} className={styles.historyItem}>
                <span className={styles.historyCapability}>{item.capability.replace(/_/g, " ")}</span>
                <span className={styles.historyMeta}>
                  {item.word_count} words • {new Date(item.created_at).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Floating AI Button */}
      <button
        className={styles.aiFloatBtn}
        onClick={() => setIsOpen(!isOpen)}
        title="AI Writing Assistant"
      >
        <span>✨</span>
      </button>

      {/* AI Assistant Panel */}
      {isOpen && (
        <div className={styles.aiPanel}>
          <div className={styles.aiHeader}>
            <h3>AI Writing Assistant</h3>
            <button
              className={styles.closeBtn}
              onClick={() => setIsOpen(false)}
            >
              ×
            </button>
          </div>

          <div className={styles.aiTabs}>
            <button
              className={activeTab === "assistant" ? styles.activeTab : ""}
              onClick={() => setActiveTab("assistant")}
            >
              Assistant
            </button>
            <button
              className={activeTab === "usage" ? styles.activeTab : ""}
              onClick={() => setActiveTab("usage")}
            >
              Usage {usage && `(${usage.remaining})`}
            </button>
          </div>

          <div className={styles.aiContent}>
            {activeTab === "assistant" ? renderAssistantPanel() : renderUsagePanel()}
          </div>
        </div>
      )}
    </>
  );
}

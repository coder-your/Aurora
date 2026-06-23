import prisma from "../utils/prisma.js";

/**
 * Embedding Service
 * Converts story content and user preferences into vector embeddings
 * using free pre-trained language models (simulated with sentence similarity)
 * 
 * In production, you would use:
 * - sentence-transformers (local, free)
 * - Hugging Face Inference API (free tier)
 * - OpenAI embeddings API (paid but reliable)
 * 
 * This implementation simulates embeddings using text similarity metrics.
 */

// Simulated embedding based on textual features
// In production, use actual pre-trained models
const generateEmbeddingFromText = (text) => {
  if (!text) return generateZeroEmbedding();

  // Create a pseudo-embedding from text features (384-dim vector simulation)
  const vector = new Array(384).fill(0);

  // Hash the text to get consistent embeddings
  const textFeatures = extractTextFeatures(text);

  // Fill embedding with normalized features
  let idx = 0;
  for (const [feature, weight] of Object.entries(textFeatures)) {
    const hashValue = hashString(feature) % 384;
    vector[hashValue] = Math.min(1, (vector[hashValue] || 0) + weight / 10);
  }

  // Normalize
  const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
  if (magnitude > 0) {
    for (let i = 0; i < vector.length; i++) {
      vector[i] = vector[i] / magnitude;
    }
  }

  return vector;
};

// Extract features from text for pseudo-embedding
const extractTextFeatures = (text) => {
  const features = {};
  const lowerText = (text || "").toLowerCase();

  // Genre features
  const genres = ["romance", "fantasy", "thriller", "sci-fi", "horror", "adventure"];
  genres.forEach((g) => {
    if (lowerText.includes(g)) features[`genre_${g}`] = 1.0;
  });

  // Theme features
  const themes = ["love", "redemption", "survival", "power", "identity", "loss"];
  themes.forEach((t) => {
    if (lowerText.includes(t)) features[`theme_${t}`] = 0.8;
  });

  // Emotion features
  const emotions = ["hopeful", "melancholic", "intense", "peaceful", "dark"];
  emotions.forEach((e) => {
    if (lowerText.includes(e)) features[`emotion_${e}`] = 0.7;
  });

  // Tone features
  const tones = ["romantic", "dark", "humorous", "serious"];
  tones.forEach((t) => {
    if (lowerText.includes(t)) features[`tone_${t}`] = 0.6;
  });

  // Writing style features
  if (lowerText.includes("descriptive")) features["style_descriptive"] = 0.8;
  if (lowerText.includes("lyrical")) features["style_lyrical"] = 0.8;
  if (lowerText.includes("minimalist")) features["style_minimalist"] = 0.8;

  // Complexity features
  if (lowerText.includes("complex")) features["complexity_high"] = 0.8;
  if (lowerText.includes("simple")) features["complexity_low"] = 0.6;

  return features;
};

// Hash function for consistent feature positioning
const hashString = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
};

// Generate zero embedding (for empty stories)
const generateZeroEmbedding = () => new Array(384).fill(0);

// Generate story embedding from analysis
export const generateStoryEmbedding = async (storyId) => {
  try {
    const story = await prisma.stories.findUnique({
      where: { story_id: storyId },
      include: {
        story_analysis: true,
        chapters: {
          select: { content_raw: true },
          take: 3, // Sample first 3 chapters
        },
      },
    });

    if (!story) throw new Error("Story not found");

    // Combine story metadata and analysis for embedding
    let embeddingText = `
      ${story.title || ""}
      ${story.description || ""}
      ${story.category || ""}
      ${story.tags || ""}
    `;

    if (story.story_analysis) {
      embeddingText += `
        ${story.story_analysis.genres || ""}
        ${story.story_analysis.primary_themes || ""}
        ${story.story_analysis.emotions || ""}
        ${story.story_analysis.tone || ""}
        ${story.story_analysis.content_summary || ""}
      `;
    }

    // Sample first few chapters for context
    for (const chapter of story.chapters) {
      const sampleContent = (chapter.content_raw || "").substring(0, 500);
      embeddingText += ` ${sampleContent}`;
    }

    // Generate embedding vector
    const vector = generateEmbeddingFromText(embeddingText);

    // Store embedding
    const embedding = await prisma.story_embeddings.upsert({
      where: { story_id: storyId },
      update: {
        embedding_vector: JSON.stringify(vector),
        updated_at: new Date(),
      },
      create: {
        story_id: storyId,
        embedding_vector: JSON.stringify(vector),
        embedding_model: "all-MiniLM-L6-v2", // Standard model name
      },
    });

    return embedding;
  } catch (error) {
    console.error("Story embedding generation error:", error.message);
    throw error;
  }
};

// Generate user preference embedding from reading behavior
export const generateUserEmbedding = async (userId) => {
  try {
    // Get user's reading data
    const [readHistory, likes, bookmarks, readingSessions, preferences] = await Promise.all([
      prisma.user_read_history.findMany({
        where: { user_id: userId },
        take: 50,
        include: { story: { include: { story_analysis: true } } },
      }),
      prisma.story_likes.findMany({
        where: { user_id: userId },
        take: 50,
        include: { story: { include: { story_analysis: true } } },
      }),
      prisma.bookmarks.findMany({
        where: { user_id: userId },
        take: 30,
        include: { story: { include: { story_analysis: true } } },
      }),
      prisma.reading_sessions.findMany({
        where: { user_id: userId },
        take: 50,
        include: { story: { include: { story_analysis: true } } },
      }),
      await buildUserPreferences(userId),
    ]);

    // Aggregate genre preferences
    let preferenceText = "";

    // From likes (strong signal)
    for (const like of likes) {
      if (like.story?.story_analysis) {
        const analysis = like.story.story_analysis;
        preferenceText += ` ${analysis.genres || ""} ${analysis.primary_themes || ""} `;
      }
    }

    // From reading history (medium signal)
    for (const history of readHistory) {
      if (history.story?.story_analysis && history.progress > 50) {
        const analysis = history.story.story_analysis;
        preferenceText += ` ${analysis.genres || ""} `;
      }
    }

    // From reading time (weak signal)
    for (const session of readingSessions) {
      if (session.story?.story_analysis && session.minutes > 10) {
        const analysis = session.story.story_analysis;
        preferenceText += ` ${analysis.emotions || ""} `;
      }
    }

    // Add explicit preferences
    for (const [prefType, tags] of Object.entries(preferences)) {
      preferenceText += ` ${tags.join(" ")} `;
    }

    // Generate embedding from aggregated preferences
    const vector = generateEmbeddingFromText(preferenceText);

    // Store user embedding
    const embedding = await prisma.user_embeddings.upsert({
      where: { user_id: userId },
      update: {
        embedding_vector: JSON.stringify(vector),
        last_updated_at: new Date(),
        update_trigger: "interaction_aggregation",
      },
      create: {
        user_id: userId,
        embedding_vector: JSON.stringify(vector),
        embedding_model: "all-MiniLM-L6-v2",
        update_trigger: "initial_generation",
      },
    });

    return embedding;
  } catch (error) {
    console.error("User embedding generation error:", error.message);
    throw error;
  }
};

// Build user preference profile
const buildUserPreferences = async (userId) => {
  const preferences = {
    favorite_genres: [],
    favorite_themes: [],
    favorite_emotions: [],
    favorite_tones: [],
  };

  try {
    // Get top genres from likes
    const genreMap = new Map();
    const likes = await prisma.story_likes.findMany({
      where: { user_id: userId },
      take: 100,
      include: { story: { include: { story_analysis: true } } },
    });

    for (const like of likes) {
      if (like.story?.story_analysis?.genres) {
        const genres = JSON.parse(like.story.story_analysis.genres || "[]");
        genres.forEach((g) => {
          genreMap.set(g, (genreMap.get(g) || 0) + 1);
        });
      }
    }

    preferences.favorite_genres = Array.from(genreMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map((e) => e[0]);

    // Get top themes
    const themeMap = new Map();
    for (const like of likes) {
      if (like.story?.story_analysis?.primary_themes) {
        const themes = JSON.parse(like.story.story_analysis.primary_themes || "[]");
        themes.forEach((t) => {
          themeMap.set(t, (themeMap.get(t) || 0) + 1);
        });
      }
    }

    preferences.favorite_themes = Array.from(themeMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map((e) => e[0]);

    // Similar for emotions and tones...
    const emotionMap = new Map();
    const toneMap = new Map();

    for (const like of likes) {
      if (like.story?.story_analysis) {
        const analysis = like.story.story_analysis;
        if (analysis.emotions) {
          JSON.parse(analysis.emotions).forEach((e) => {
            emotionMap.set(e, (emotionMap.get(e) || 0) + 1);
          });
        }
        if (analysis.tone) {
          toneMap.set(analysis.tone, (toneMap.get(analysis.tone) || 0) + 1);
        }
      }
    }

    preferences.favorite_emotions = Array.from(emotionMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map((e) => e[0]);

    preferences.favorite_tones = Array.from(toneMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map((e) => e[0]);
  } catch (error) {
    console.warn("Error building user preferences:", error.message);
  }

  return preferences;
};

// Calculate cosine similarity between two vectors
export const cosineSimilarity = (vecA, vecB) => {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;

  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    magnitudeA += vecA[i] * vecA[i];
    magnitudeB += vecB[i] * vecB[i];
  }

  magnitudeA = Math.sqrt(magnitudeA);
  magnitudeB = Math.sqrt(magnitudeB);

  if (magnitudeA === 0 || magnitudeB === 0) return 0;

  return dotProduct / (magnitudeA * magnitudeB);
};

// Get story embedding
export const getStoryEmbedding = async (storyId) => {
  return await prisma.story_embeddings.findUnique({
    where: { story_id: storyId },
  });
};

// Get user embedding
export const getUserEmbedding = async (userId) => {
  return await prisma.user_embeddings.findUnique({
    where: { user_id: userId },
  });
};

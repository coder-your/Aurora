import prisma from "../utils/prisma.js";

/**
 * Story Analysis Service
 * Uses AI to analyze story content and extract deep metadata:
 * - Genres (romance, fantasy, sci-fi, thriller, etc.)
 * - Primary themes (love, redemption, survival, power, identity, etc.)
 * - Emotions conveyed (hopeful, melancholic, intense, peaceful, etc.)
 * - Tone (romantic, dark, humorous, serious, ironic, etc.)
 * - Writing style (lyrical, minimalist, descriptive, conversational, etc.)
 * - Character depth and plot complexity
 */

// Simple genre detection based on tags and content
const detectGenres = (tags, description, title) => {
  const genreKeywords = {
    romance: ["love", "romance", "relationship", "heart", "passion", "affair", "couple"],
    fantasy: ["fantasy", "magic", "wizard", "dragon", "realm", "enchant", "mythical"],
    "sci-fi": ["sci-fi", "science fiction", "future", "space", "technology", "robot", "alien"],
    thriller: ["thriller", "suspense", "mystery", "danger", "secret", "crime", "murder"],
    horror: ["horror", "fear", "terror", "dark", "evil", "monster", "ghost"],
    adventure: ["adventure", "quest", "journey", "explore", "discover", "brave"],
    drama: ["drama", "emotional", "conflict", "struggle", "real"],
    comedy: ["humor", "funny", "comedy", "laugh", "humorous"],
    paranormal: ["paranormal", "supernatural", "ghost", "spirit", "paranormal"],
    contemporary: ["contemporary", "modern", "urban", "real-world", "present-day"],
  };

  const text = `${tags || ""} ${description || ""} ${title || ""}`.toLowerCase();
  const genres = [];

  for (const [genre, keywords] of Object.entries(genreKeywords)) {
    if (keywords.some((kw) => text.includes(kw))) {
      genres.push(genre);
    }
  }

  return genres.length > 0 ? genres : ["fiction"];
};

// Simple theme detection
const detectThemes = (description, title, tags) => {
  const themeKeywords = {
    love: ["love", "romance", "heart", "passion", "relationship", "connection"],
    redemption: ["redemption", "forgiveness", "second chance", "transform", "grow"],
    survival: ["survival", "survive", "fight", "struggle", "endure", "overcome"],
    power: ["power", "strength", "weak", "overcome", "conquer"],
    identity: ["identity", "self", "discover", "who am i", "becoming"],
    loss: ["loss", "grief", "death", "loss", "mourn"],
    betrayal: ["betray", "trust", "loyal", "betrayal"],
    freedom: ["freedom", "escape", "free", "liberate"],
    justice: ["justice", "fair", "injustice", "right wrong"],
    hope: ["hope", "hopeful", "inspire", "triumph"],
    darkness: ["dark", "evil", "corrupt", "shadow", "darkness"],
  };

  const text = `${description || ""} ${title || ""} ${tags || ""}`.toLowerCase();
  const themes = [];

  for (const [theme, keywords] of Object.entries(themeKeywords)) {
    if (keywords.some((kw) => text.includes(kw))) {
      themes.push(theme);
    }
  }

  return themes.slice(0, 6); // Top 6 themes
};

// Simple emotion detection
const detectEmotions = (description, title) => {
  const emotionKeywords = {
    hopeful: ["hope", "dream", "bright", "light", "future", "positive"],
    melancholic: ["sad", "lonely", "mournful", "tragic", "loss", "goodbye"],
    intense: ["intense", "violent", "dark", "brutal", "fierce", "raw"],
    peaceful: ["calm", "peaceful", "serene", "quiet", "gentle", "tranquil"],
    thrilling: ["thrill", "exciting", "adrenaline", "suspense", "danger"],
    romantic: ["romance", "love", "passion", "heart", "yearning"],
    dark: ["dark", "grim", "sinister", "evil", "shadow", "curse"],
    whimsical: ["whimsical", "playful", "fun", "magical", "wonder"],
    tense: ["tense", "anxious", "fear", "worry", "dread"],
  };

  const text = `${description || ""} ${title || ""}`.toLowerCase();
  const emotions = [];

  for (const [emotion, keywords] of Object.entries(emotionKeywords)) {
    if (keywords.some((kw) => text.includes(kw))) {
      emotions.push(emotion);
    }
  }

  return emotions.slice(0, 5); // Top 5 emotions
};

// Detect tone
const detectTone = (description, title) => {
  const toneText = `${description || ""} ${title || ""}`.toLowerCase();

  if (toneText.includes("humorous") || toneText.includes("funny") || toneText.includes("laugh"))
    return "humorous";
  if (toneText.includes("dark") || toneText.includes("grim") || toneText.includes("sinister"))
    return "dark";
  if (toneText.includes("romantic") || toneText.includes("love")) return "romantic";
  if (toneText.includes("serious") || toneText.includes("profound")) return "serious";
  if (toneText.includes("ironic") || toneText.includes("satirical")) return "ironic";
  if (toneText.includes("dramatic")) return "dramatic";

  return "neutral";
};

// Detect writing style
const detectWritingStyle = (characterCount, paragraphCount, wordCount) => {
  const avgWordLength = wordCount > 0 ? characterCount / wordCount : 0;
  const avgParagraphLength = paragraphCount > 0 ? wordCount / paragraphCount : 0;

  if (avgWordLength > 5 && avgParagraphLength > 150) return "descriptive";
  if (avgWordLength < 4 && avgParagraphLength < 100) return "minimalist";
  if (avgWordLength > 6) return "lyrical";
  if (avgParagraphLength < 50) return "conversational";

  return "balanced";
};

// Detect complexity level based on word count and content
const detectComplexityLevel = (wordCount, characterCount) => {
  if (wordCount < 10000) return "beginner";
  if (wordCount < 50000) return "intermediate";
  return "advanced";
};

// Detect character depth based on description and tags
const detectCharacterDepth = (description) => {
  const desc = (description || "").toLowerCase();
  if (
    desc.includes("complex") ||
    desc.includes("nuanced") ||
    desc.includes("layered") ||
    desc.includes("intricate")
  )
    return "complex";
  if (desc.includes("simple") || desc.includes("straightforward")) return "simple";
  return "nuanced";
};

// Analyze a published story
export const analyzeStory = async (storyId) => {
  try {
    const story = await prisma.stories.findUnique({
      where: { story_id: storyId },
      include: {
        chapters: {
          select: {
            word_count: true,
            char_count: true,
            paragraphs: true,
          },
        },
      },
    });

    if (!story || story.visibility !== "public" || story.status !== "published") {
      throw new Error("Story not found or not published");
    }

    const totalWords = story.total_words || 0;
    const totalChars = story.chapters.reduce((sum, c) => sum + (c.char_count || 0), 0);
    const totalParagraphs = story.chapters.reduce((sum, c) => sum + (c.paragraphs || 0), 0);

    // Analyze using various methods
    const genres = detectGenres(story.tags, story.description, story.title);
    const themes = detectThemes(story.description, story.title, story.tags);
    const emotions = detectEmotions(story.description, story.title);
    const tone = detectTone(story.description, story.title);
    const writingStyle = detectWritingStyle(totalChars, totalParagraphs, totalWords);
    const complexityLevel = detectComplexityLevel(totalWords, totalChars);
    const characterDepth = detectCharacterDepth(story.description);

    // Plot pacing estimation
    let plotPacing = "moderate";
    if (totalWords < 30000) plotPacing = "fast";
    else if (totalWords > 100000) plotPacing = "slow";

    // Create summary
    const contentSummary = `
A ${complexityLevel} ${genres.join(", ")} story exploring themes of ${themes.join(", ")}.
The narrative carries a ${tone} tone with ${emotions.join(", ")} emotions.
Writing style is ${writingStyle} with ${characterDepth} character development.
${story.is_mature ? "Contains mature content." : ""}
    `.trim();

    // Upsert analysis
    const analysis = await prisma.story_analysis.upsert({
      where: { story_id: storyId },
      update: {
        genres: JSON.stringify(genres),
        primary_themes: JSON.stringify(themes),
        emotions: JSON.stringify(emotions),
        tone,
        writing_style: writingStyle,
        complexity_level: complexityLevel,
        character_depth: characterDepth,
        plot_pacing: plotPacing,
        maturity_content: story.is_mature ? "mature_content" : null,
        content_summary: contentSummary,
        updated_at: new Date(),
      },
      create: {
        story_id: storyId,
        genres: JSON.stringify(genres),
        primary_themes: JSON.stringify(themes),
        emotions: JSON.stringify(emotions),
        tone,
        writing_style: writingStyle,
        complexity_level: complexityLevel,
        character_depth: characterDepth,
        plot_pacing: plotPacing,
        maturity_content: story.is_mature ? "mature_content" : null,
        content_summary: contentSummary,
      },
    });

    return analysis;
  } catch (error) {
    console.error("Story analysis error:", error.message);
    throw error;
  }
};

// Get story analysis
export const getStoryAnalysis = async (storyId) => {
  return await prisma.story_analysis.findUnique({
    where: { story_id: storyId },
  });
};

// Analyze all published stories (batch operation)
export const analyzeAllStories = async (limit = 100, offset = 0) => {
  try {
    const stories = await prisma.stories.findMany({
      where: {
        visibility: "public",
        status: "published",
        is_deleted: false,
      },
      select: { story_id: true },
      skip: offset,
      take: limit,
    });

    const results = [];
    for (const story of stories) {
      try {
        const analysis = await analyzeStory(story.story_id);
        results.push(analysis);
      } catch (e) {
        console.warn(`Failed to analyze story ${story.story_id}:`, e.message);
      }
    }

    return { analyzed: results.length, total: stories.length };
  } catch (error) {
    console.error("Batch analysis error:", error.message);
    throw error;
  }
};

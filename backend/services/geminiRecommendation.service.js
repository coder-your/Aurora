import { GoogleGenerativeAI } from "@google/generative-ai";
import prisma from "../utils/prisma.js";

const getGenAI = () => {
  const key = process.env.GEMINI_API_KEY;
  return key ? new GoogleGenerativeAI(key) : null;
};

const GEMINI_MODEL = "gemini-2.0-flash";
const DEFAULT_LIMIT = 5;
const MAX_LIMIT = 10;
const DEFAULT_CATALOG_SIZE = 80;

const authorInclude = {
  author: {
    select: {
      user_id: true,
      first_name: true,
      last_name: true,
      profile: {
        select: {
          first_name: true,
          last_name: true,
          handle_name: true,
          profile_image: true,
        },
      },
    },
  },
};

const publishedPublicWhere = {
  visibility: "public",
  status: "published",
  is_deleted: false,
};

const truncate = (text, max = 400) => {
  const s = (text || "").trim();
  if (s.length <= max) return s;
  return `${s.slice(0, max - 1)}…`;
};

const parseGeminiJson = (text) => {
  const raw = (text || "").trim();
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;
  try {
    return JSON.parse(jsonMatch[0]);
  } catch {
    return null;
  }
};

const toPromptBook = (story) => {
  if (!story) return null;
  const id = story.story_id ?? story.id;
  if (!id) return null;

  const analysis = story.story_analysis || story.analysis || null;

  return {
    story_id: Number(id),
    title: story.title || "Untitled",
    description: truncate(story.description, 500),
    category: story.category || null,
    tags: story.tags || null,
    themes: analysis?.primary_themes || null,
    tone: analysis?.tone || null,
    emotions: analysis?.emotions || null,
    genres: analysis?.genres || null,
    content_summary: truncate(analysis?.content_summary, 300),
  };
};

const normalizeClientBook = (book) => {
  if (!book || typeof book !== "object") return null;
  const id = book.story_id ?? book.id;
  if (!id) return null;
  return toPromptBook({
    story_id: id,
    title: book.title,
    description: book.description,
    category: book.category,
    tags: book.tags,
    story_analysis: book.story_analysis || book.analysis,
  });
};

export const loadSourceAndCatalogFromDb = async (storyId, catalogSize = DEFAULT_CATALOG_SIZE) => {
  const source = await prisma.stories.findUnique({
    where: { story_id: storyId },
    include: {
      story_analysis: true,
      ...authorInclude,
    },
  });

  if (!source || source.is_deleted) {
    throw new Error("Story not found");
  }

  const catalog = await prisma.stories.findMany({
    where: {
      ...publishedPublicWhere,
      story_id: { not: storyId },
    },
    include: {
      story_analysis: true,
      ...authorInclude,
    },
    orderBy: [{ last_updated: "desc" }, { story_id: "desc" }],
    take: Math.min(Math.max(catalogSize, 10), 150),
  });

  return { source, catalog };
};

const buildRecommendationPrompt = (sourceBook, catalogBooks, limit) => {
  const source = toPromptBook(sourceBook);
  const catalog = catalogBooks.map(toPromptBook).filter(Boolean);

  return `You are an intelligent fiction recommendation engine for the AURORA reading platform.
Your job is to recommend books from the CATALOG that a reader would love after reading the SOURCE BOOK.

Rules:
- Analyze underlying themes, emotional tone, narrative style, and plot texture — do NOT rely on simple tag or category matching alone.
- Only recommend story_id values that appear in the CATALOG.
- Never recommend the source book (story_id ${source?.story_id}).
- Return exactly ${limit} recommendations, ordered from best match to weakest.
- Each "reason" must be 1–2 warm, specific sentences addressed to the reader (use "you"), explaining the thematic or tonal connection.

Respond with ONLY valid JSON (no markdown), in this shape:
{
  "recommendations": [
    { "story_id": <number>, "reason": "<string>" }
  ]
}

SOURCE BOOK:
${JSON.stringify(source, null, 2)}

CATALOG:
${JSON.stringify(catalog, null, 2)}`;
};

const callGeminiForRecommendations = async (prompt) => {
  const genAI = getGenAI();
  if (!genAI) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const model = genAI.getGenerativeModel({
    model: GEMINI_MODEL,
    generationConfig: {
      temperature: 0.65,
      maxOutputTokens: 2048,
      responseMimeType: "application/json",
    },
  });

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  const parsed = parseGeminiJson(text);

  if (!parsed?.recommendations || !Array.isArray(parsed.recommendations)) {
    throw new Error("Gemini returned an invalid recommendation payload");
  }

  return parsed.recommendations;
};

const tagSet = (tags) => {
  if (!tags) return new Set();
  return new Set(
    String(tags)
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean)
  );
};

const fallbackRecommendations = (sourceBook, catalogStories, limit) => {
  const sourceTags = tagSet(sourceBook.tags);
  const sourceThemes = (sourceBook.story_analysis?.primary_themes || "")
    .toLowerCase()
    .split(/[,;|]/)
    .map((t) => t.trim())
    .filter(Boolean);

  const scored = catalogStories
    .map((story) => {
      let score = 0;
      const reasons = [];

      if (sourceBook.category && story.category === sourceBook.category) {
        score += 3;
        reasons.push(`same ${story.category} category`);
      }

      const storyTags = tagSet(story.tags);
      let tagOverlap = 0;
      sourceTags.forEach((t) => {
        if (storyTags.has(t)) tagOverlap += 1;
      });
      if (tagOverlap > 0) {
        score += tagOverlap * 2;
        reasons.push("shared themes in its tags");
      }

      const storyThemes = (story.story_analysis?.primary_themes || "").toLowerCase();
      const themeHits = sourceThemes.filter((t) => t.length > 2 && storyThemes.includes(t)).length;
      if (themeHits > 0) {
        score += themeHits * 2.5;
        reasons.push("overlapping story themes");
      }

      if (sourceBook.story_analysis?.tone && story.story_analysis?.tone === sourceBook.story_analysis.tone) {
        score += 2;
        reasons.push(`a similar ${story.story_analysis.tone} tone`);
      }

      const reasonText =
        reasons.length > 0
          ? `You may enjoy this pick because it offers ${reasons.slice(0, 2).join(" and ")} — much like "${sourceBook.title || "this story"}".`
          : `You might like this as a fresh read with comparable energy to "${sourceBook.title || "this story"}".`;

      return { story, score, reasonText };
    })
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score);

  const picked =
    scored.length >= limit
      ? scored.slice(0, limit)
      : [
          ...scored,
          ...catalogStories
            .filter((s) => !scored.some((r) => r.story.story_id === s.story_id))
            .slice(0, Math.max(0, limit - scored.length))
            .map((story) => ({
              story,
              score: 0,
              reasonText: `Explore "${story.title || "this story"}" — a popular pick readers are enjoying right now.`,
            })),
        ].slice(0, limit);

  return picked.map((row) => ({
    story_id: row.story.story_id,
    reason: row.reasonText,
  }));
};

const enrichRecommendations = (rawRecs, catalogStories, validIds) => {
  const byId = new Map(catalogStories.map((s) => [s.story_id, s]));
  const seen = new Set();

  return rawRecs
    .map((rec) => {
      const id = Number(rec.story_id ?? rec.id);
      if (!Number.isFinite(id) || !validIds.has(id) || seen.has(id)) return null;
      seen.add(id);
      const story = byId.get(id);
      if (!story) return null;

      return {
        story_id: story.story_id,
        title: story.title,
        description: story.description,
        category: story.category,
        tags: story.tags,
        cover_url: story.cover_url,
        author: story.author,
        ai_reason: (rec.reason || rec.ai_reason || "").trim(),
      };
    })
    .filter(Boolean);
};

/**
 * Gemini-powered recommendations for a source book against a catalog sample.
 * Accepts either storyId (loads from DB) or explicit sourceBook + catalogBooks from the client.
 */
export const getGeminiFeedRecommendations = async ({
  feedName,
  userProfile,
  catalogBooks,
  limit = DEFAULT_LIMIT,
}) => {
  if (!genAI) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const catalog = catalogBooks.map(toPromptBook).filter(Boolean);

  const prompt = `You are an intelligent fiction recommendation engine for the AURORA reading platform.
Your job is to recommend books from the CATALOG for a specific feed: "${feedName}".
The user has the following taste profile based on their reading history:
- Favorite Categories: ${userProfile.categories.join(", ") || "None specified"}
- Favorite Tags/Themes: ${userProfile.tags.join(", ") || "None specified"}

Rules:
- Select the best books from the CATALOG that fit both the feed intent ("${feedName}") and the user's taste profile.
- Only recommend story_id values that appear in the CATALOG.
- Return exactly ${limit} recommendations, ordered from best match to weakest.
- Each "reason" must be 1-2 warm, specific sentences addressed to the reader (use "you"), explaining why this book fits the feed and their tastes.

Respond with ONLY valid JSON (no markdown), in this shape:
{
  "recommendations": [
    { "story_id": <number>, "reason": "<string>" }
  ]
}

CATALOG:
${JSON.stringify(catalog, null, 2)}`;

  const model = genAI.getGenerativeModel({
    model: GEMINI_MODEL,
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 2048,
      responseMimeType: "application/json",
    },
  });

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  const parsed = parseGeminiJson(text);

  if (!parsed?.recommendations || !Array.isArray(parsed.recommendations)) {
    throw new Error("Gemini returned an invalid recommendation payload");
  }

  return parsed.recommendations;
};

export const getGeminiBookRecommendations = async ({
  storyId,
  sourceBook: clientSource,
  catalogBooks: clientCatalog,
  limit = DEFAULT_LIMIT,
  catalogSize = DEFAULT_CATALOG_SIZE,
}) => {
  const pickLimit = Math.min(Math.max(Number(limit) || DEFAULT_LIMIT, 1), MAX_LIMIT);

  let sourceRecord;
  let catalogRecords;

  if (clientSource && Array.isArray(clientCatalog) && clientCatalog.length > 0) {
    const normalizedSource = normalizeClientBook(clientSource);
    if (!normalizedSource) throw new Error("Invalid source book payload");

    const ids = clientCatalog
      .map((b) => Number(b.story_id ?? b.id))
      .filter((id) => Number.isFinite(id) && id !== normalizedSource.story_id);

    catalogRecords = await prisma.stories.findMany({
      where: {
        story_id: { in: ids },
        ...publishedPublicWhere,
      },
      include: {
        story_analysis: true,
        ...authorInclude,
      },
    });

    sourceRecord = await prisma.stories.findUnique({
      where: { story_id: normalizedSource.story_id },
      include: { story_analysis: true, ...authorInclude },
    });

    if (!sourceRecord) {
      sourceRecord = {
        story_id: normalizedSource.story_id,
        title: clientSource.title,
        description: clientSource.description,
        category: clientSource.category,
        tags: clientSource.tags,
        story_analysis: clientSource.story_analysis || clientSource.analysis,
        author: clientSource.author,
      };
    }
  } else {
    const id = Number(storyId);
    if (!Number.isFinite(id)) throw new Error("storyId is required");

    const loaded = await loadSourceAndCatalogFromDb(id, catalogSize);
    sourceRecord = loaded.source;
    catalogRecords = loaded.catalog;
  }

  if (!catalogRecords.length) {
    return {
      source_story_id: sourceRecord.story_id,
      recommendations: [],
      total: 0,
      engine: "none",
    };
  }

  const validIds = new Set(catalogRecords.map((s) => s.story_id));
  let rawRecs = [];
  let engine = "gemini";

  try {
    const prompt = buildRecommendationPrompt(sourceRecord, catalogRecords, pickLimit);
    rawRecs = await callGeminiForRecommendations(prompt);
  } catch (err) {
    console.warn("Gemini recommendation fallback:", err.message);
    engine = "fallback";
    rawRecs = fallbackRecommendations(sourceRecord, catalogRecords, pickLimit);
  }

  const recommendations = enrichRecommendations(rawRecs, catalogRecords, validIds).slice(0, pickLimit);

  if (recommendations.length < pickLimit && engine === "gemini") {
    const fallback = fallbackRecommendations(sourceRecord, catalogRecords, pickLimit);
    const merged = enrichRecommendations(
      [...recommendations.map((r) => ({ story_id: r.story_id, reason: r.ai_reason })), ...fallback],
      catalogRecords,
      validIds
    ).slice(0, pickLimit);
    return {
      source_story_id: sourceRecord.story_id,
      recommendations: merged,
      total: merged.length,
      engine: merged.length ? "gemini" : "fallback",
    };
  }

  return {
    source_story_id: sourceRecord.story_id,
    recommendations,
    total: recommendations.length,
    engine,
  };
};
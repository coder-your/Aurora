import { GoogleGenerativeAI } from "@google/generative-ai";


const getGenAI = () => {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  return new GoogleGenerativeAI(key);
};

// ---- Sentiment word lists for the heuristic fallback ----
const POSITIVE_WORDS = [
  "amazing", "awesome", "beautiful", "beautifull", "best", "brilliant", "captivating",
  "clever", "compelling", "delightful", "enjoy", "enjoyable", "enjoyed", "engrossing",
  "excellent", "exceptional", "favorite", "favourite", "flawless", "fantastic", "good",
  "great", "gripping", "heartwarming", "immersive", "incredible", "loved", "lovely",
  "masterful", "masterpiece", "memorable", "moving", "must-read", "outstanding",
  "page-turner", "perfect", "phenomenal", "powerful", "recommend", "recommended",
  "remarkable", "splendid", "stunning", "superb", "terrific", "unforgettable",
  "wonderful", "wondrous",
];

const NEGATIVE_WORDS = [
  "annoying", "atrocious", "awful", "bad", "boring", "cliche", "confusing", "dreadful",
  "drear", "disappointed", "disappointing", "dull", "fail", "failed", "flat", "grim",
  "hated", "hate", "horrendous", "horrible", "meh", "mediocre", "messy", "not worth",
  "overrated", "poor", "poorly", "predictable", "ridiculous", "save your money",
  "shallow", "skip it", "slow", "snore", "stereotypical", "tedious", "terrible",
  "uninspired", "unlikable", "unlikeable", "unreadable", "weak", "waste",
  "would not recommend", "wouldn't recommend",
];

// Remove HTML entities/tags and collapse whitespace.
const stripHtml = (text) =>
  String(text || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

// Count how many times each word (or phrase) appears in the lowercased text.
const countMatches = (lowerText, words) => {
  let count = 0;
  words.forEach((w) => {
    count += lowerText.split(w.toLowerCase()).length - 1;
  });
  return count;
};

// Heuristic fallback used when the AI call is unavailable or malformed.
// Ensures clearly positive reviews get a high rating and clearly negative ones
// get a low rating instead of always defaulting to 3.
const heuristicRating = (text) => {
  const cleaned = stripHtml(text);
  if (!cleaned) return 3;

  const lower = cleaned.toLowerCase();
  const positive = countMatches(lower, POSITIVE_WORDS);
  const negative = countMatches(lower, NEGATIVE_WORDS);
  const score = positive - negative;

  if (score >= 4) return 5;
  if (score >= 1) return 4;
  if (score <= -4) return 1;
  if (score <= -1) return 2;
  return 3;
};

export const inferReviewStarRating = async (reviewText) => {
  const cleaned = stripHtml(reviewText);
  if (!cleaned) return 3;

  const client = getGenAI();
  if (!client) {
    console.warn("GEMINI_API_KEY not set - using heuristic rating");
    return heuristicRating(cleaned);
  }

  try {
    const model = client.getGenerativeModel({
      model: "gemini-2.0-flash",
      generationConfig: {
        temperature: 0,
        maxOutputTokens: 5,
      },
    });

    const prompt = `You are a book review rating assistant. Rate the following book review from 1 to 5 stars based on its overall sentiment.
Respond with ONLY a single integer from 1 to 5. Do not include any other text, words, punctuation, or explanation.

Review: "${cleaned}"

Rating:`;

    const result = await model.generateContent(prompt);
    const text = (result.response.text() || "").trim();

    // Extract the first 1-5 integer the model returns.
    const match = text.match(/[1-5]/);
    if (match) {
      const rating = parseInt(match[0], 10);
      return Math.min(5, Math.max(1, rating));
    }

    console.warn("Gemini returned unexpected format for rating:", text);
    return heuristicRating(cleaned);
  } catch (error) {
    console.error("Gemini rating inference failed - using heuristic fallback:", error.message || error);
    return heuristicRating(cleaned);
  }
};

import { GoogleGenerativeAI } from "@google/generative-ai";
import { analyzeToxicity } from "../utils/toxicity.js";
import {
  PLOT_TWIST_LIMITS,
  SPAM_PHRASES,
  MODERATION_STATUS,
} from "../constants/aurora.constants.js";

const genAI = process.env.GEMINI_API_KEY
  ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  : null;

export const validateSubmissionText = ({ twistTitle, twistDescription, whyFits }) => {
  const title = (twistTitle || "").trim();
  const description = (twistDescription || "").trim();
  const why = (whyFits || "").trim();
  const combined = `${title} ${description} ${why}`.trim();
  const combinedLen = combined.length;

  if (!title || title.length < 5) {
    return { valid: false, message: "Twist title must be at least 5 characters." };
  }
  if (title.length > 120) {
    return { valid: false, message: "Twist title must be 120 characters or fewer." };
  }
  if (!description || !why) {
    return { valid: false, message: "Description and 'why it fits' are required." };
  }
  if (combinedLen < PLOT_TWIST_LIMITS.MIN_COMBINED_CHARS) {
    return {
      valid: false,
      message: `Combined text must be at least ${PLOT_TWIST_LIMITS.MIN_COMBINED_CHARS} characters (currently ${combinedLen}).`,
    };
  }
  if (combinedLen > PLOT_TWIST_LIMITS.MAX_COMBINED_CHARS) {
    return {
      valid: false,
      message: `Combined text must be at most ${PLOT_TWIST_LIMITS.MAX_COMBINED_CHARS} characters (currently ${combinedLen}).`,
    };
  }

  for (const pattern of SPAM_PHRASES) {
    if (pattern.test(combined)) {
      return { valid: false, message: "Submission looks like low-effort spam." };
    }
  }

  const wordCount = combined.split(/\s+/).filter(Boolean).length;
  if (wordCount < 15) {
    return { valid: false, message: "Please provide more detail in your plot twist." };
  }

  return { valid: true, combined, combinedLen };
};

const ruleBasedScore = (combined) => {
  let score = 70;
  const len = combined.length;
  if (len >= 200 && len <= 450) score += 10;
  if (len < 120) score -= 25;
  const sentences = combined.split(/[.!?]+/).filter((s) => s.trim().length > 10);
  if (sentences.length >= 2) score += 5;
  if (/chapter|character|plot|story|because|since|reveals?/i.test(combined)) score += 5;
  return Math.min(98, Math.max(0, score));
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

const fallbackModeration = (combined) => {
  const qualityScore = ruleBasedScore(combined);
  const approved = qualityScore >= PLOT_TWIST_LIMITS.MIN_QUALITY_FOR_AUTHOR;
  return {
    moderationStatus: approved ? MODERATION_STATUS.APPROVED : MODERATION_STATUS.REJECTED,
    qualityScore,
    originalityLabel: qualityScore >= 85 ? "high" : qualityScore >= 70 ? "medium" : "low",
    excitementLabel: qualityScore >= 80 ? "high" : qualityScore >= 65 ? "medium" : "low",
    moderationNotes: approved ? "Passed rule-based review." : "Did not meet quality threshold.",
  };
};

export const moderatePlotTwistSubmission = async ({
  twistTitle,
  twistDescription,
  whyFits,
  chapterTitle,
  storyTitle,
  existingTitles = [],
}) => {
  // Enforce 300-char twist length requirement (applies to description only)
  const descriptionLen = (twistDescription || "").trim().length;
  if (descriptionLen > 300) {
    return {
      ok: false,
      message: "Twist description must be 300 characters or fewer.",
      moderationStatus: MODERATION_STATUS.REJECTED,
      qualityScore: 0,
    };
  }

  const validation = validateSubmissionText({ twistTitle, twistDescription, whyFits });
  if (!validation.valid) {
    return {
      ok: false,
      ...validation,
      moderationStatus: MODERATION_STATUS.REJECTED,
    };
  }

  const combined = validation.combined;
  const toxicity = await analyzeToxicity(combined);
  if (toxicity.isToxic) {
    return {
      ok: false,
      message: "Submission contains inappropriate content.",
      moderationStatus: MODERATION_STATUS.REJECTED,
      qualityScore: 0,
    };
  }

  const dupTitle = existingTitles.some(
    (t) => t.toLowerCase().trim() === twistTitle.toLowerCase().trim()
  );
  if (dupTitle) {
    return {
      ok: false,
      message: "A submission with a very similar title already exists for this event.",
      moderationStatus: MODERATION_STATUS.REJECTED,
      qualityScore: 0,
    };
  }

  if (!genAI) {
    const fb = fallbackModeration(combined);
    return { ok: true, ...fb, combinedLen: validation.combinedLen };
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const prompt = `You moderate plot twist submissions for a fiction platform.

Story: "${storyTitle || "Unknown"}"
Chapter: "${chapterTitle || "Unknown"}"

Submission:
Title: ${twistTitle}
Description: ${twistDescription}
Why it fits: ${whyFits}

Check for: spam, duplicates, toxic content, nonsense, off-topic twists.

Respond ONLY with JSON:
{
  "approved": boolean,
  "qualityScore": number (0-100),
  "originality": "low"|"medium"|"high",
  "excitement": "low"|"medium"|"high",
  "notes": "short reason"
}`;

    const result = await model.generateContent(prompt);
    const parsed = parseGeminiJson(result.response.text());

    if (!parsed || typeof parsed.qualityScore !== "number") {
      const fb = fallbackModeration(combined);
      return { ok: true, ...fb, combinedLen: validation.combinedLen };
    }

    const qualityScore = Math.min(100, Math.max(0, Number(parsed.qualityScore)));
    const approved =
      parsed.approved === true && qualityScore >= PLOT_TWIST_LIMITS.MIN_QUALITY_FOR_AUTHOR;

    return {
      ok: true,
      moderationStatus: approved ? MODERATION_STATUS.APPROVED : MODERATION_STATUS.REJECTED,
      qualityScore,
      originalityLabel: parsed.originality || "medium",
      excitementLabel: parsed.excitement || "medium",
      moderationNotes: parsed.notes || "",
      combinedLen: validation.combinedLen,
    };
  } catch (err) {
    console.warn("Gemini moderation fallback:", err.message);
    const fb = fallbackModeration(combined);
    return { ok: true, ...fb, combinedLen: validation.combinedLen };
  }
};

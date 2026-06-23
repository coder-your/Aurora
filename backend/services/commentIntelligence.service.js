import prisma from "../utils/prisma.js";

const STOP_WORDS = new Set([
  "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with",
  "by", "from", "as", "is", "was", "are", "were", "been", "be", "have", "has", "had",
  "do", "does", "did", "will", "would", "could", "should", "may", "might", "must",
  "shall", "can", "need", "dare", "ought", "used", "it", "its", "this", "that",
  "these", "those", "i", "you", "he", "she", "we", "they", "what", "which", "who",
  "whom", "whose", "where", "when", "why", "how", "all", "each", "every", "both",
  "few", "more", "most", "other", "some", "such", "no", "nor", "not", "only", "own",
  "same", "so", "than", "too", "very", "just", "also", "now", "here", "there", "then",
  "once", "if", "because", "until", "while", "about", "into", "through", "during",
  "before", "after", "above", "below", "between", "under", "again", "further",
  "am", "my", "me", "your", "his", "her", "our", "their", "up", "down", "out", "off",
  "over", "any", "get", "got", "like", "really", "even", "still", "back", "much",
  "well", "way", "want", "going", "know", "think", "see", "come", "make", "take",
  "go", "good", "new", "first", "last", "long", "great", "little", "own", "old",
  "right", "big", "high", "different", "small", "large", "next", "early", "young",
  "important", "few", "public", "bad", "same", "able", "im", "dont", "cant", "wont",
  "didnt", "isnt", "arent", "wasnt", "werent", "hasnt", "havent", "hadnt", "doesnt",
  "wouldnt", "couldnt", "shouldnt", "mightnt", "mustnt", "ive", "youve", "weve",
  "theyve", "id", "youd", "hed", "shed", "wed", "theyd", "ill", "youll", "hell",
  "shell", "well", "theyll", "thats", "whats", "lets", "heres", "theres", "whos",
  "its", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten",
]);

const HYPE_PATTERNS = [
  /love\s*(this|it)/i, /amazing/i, /awesome/i, /incredible/i, /fantastic/i,
  /best\s*(story|book|chapter)/i, /can'?t\s*wait/i, /next\s*chapter/i, /more\s*please/i,
  /update\s*soon/i, /so\s*good/i, /obsessed/i, /addicted/i, /hooked/i, /masterpiece/i,
  /perfect/i, /brilliant/i, /beautiful/i, /wonderful/i, /favorite/i, /favourite/i,
  /❤|💕|😍|🔥|💯|👏|🥰|💖|✨/,
];

const EMOTIONAL_PATTERNS = [
  /crying/i, /tears/i, /sobbing/i, /bawling/i, /weeping/i,
  /how\s*could\s*you/i, /why\s*did\s*you/i, /i\s*can'?t\s*believe/i,
  /my\s*heart/i, /heartbroken/i, /devastated/i, /shocked/i, /screaming/i,
  /dead/i, /dying/i, /killed\s*me/i, /destroyed/i, /shook/i,
  /😭|😢|💔|😱|🥺|😤|😫/,
];

const ANALYTICAL_PATTERNS = [
  /i\s*think/i, /theory/i, /predict/i, /foreshadow/i, /symbolism/i,
  /maybe\s*(he|she|they|it)/i, /what\s*if/i, /could\s*it\s*be/i,
  /i\s*bet/i, /calling\s*it/i, /plot\s*twist/i, /connection/i,
  /noticed/i, /realized/i, /makes\s*sense/i, /hints?\s*at/i,
  /parallel/i, /motif/i, /character\s*(development|arc)/i,
];

const CRITIC_PATTERNS = [
  /typo/i, /error/i, /mistake/i, /inconsisten/i, /plot\s*hole/i,
  /pacing/i, /confusing/i, /unclear/i, /doesn'?t\s*make\s*sense/i,
  /should\s*have/i, /could\s*be\s*better/i, /needs\s*work/i,
  /rushed/i, /slow/i, /dragging/i, /repetitive/i, /cliché/i, /cliche/i,
  /editing/i, /grammar/i, /spelling/i, /awkward/i,
];

function classifySentiment(text) {
  const t = text || "";
  const scores = { hype: 0, emotional: 0, analytical: 0, critic: 0 };

  for (const p of HYPE_PATTERNS) if (p.test(t)) scores.hype += 1;
  for (const p of EMOTIONAL_PATTERNS) if (p.test(t)) scores.emotional += 1;
  for (const p of ANALYTICAL_PATTERNS) if (p.test(t)) scores.analytical += 1;
  for (const p of CRITIC_PATTERNS) if (p.test(t)) scores.critic += 1;

  const max = Math.max(scores.hype, scores.emotional, scores.analytical, scores.critic);
  if (max === 0) return "neutral";
  if (scores.hype === max) return "hype";
  if (scores.emotional === max) return "emotional";
  if (scores.analytical === max) return "analytical";
  return "critic";
}

function isQuestion(text) {
  return /\?\s*$/.test((text || "").trim());
}

function extractWords(text) {
  return (text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s'-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
}

export async function getCommentIntelligence(writerId, storyId = null, days = 30) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const writerStories = await prisma.stories.findMany({
    where: { author_id: writerId, is_deleted: false },
    select: { story_id: true },
  });
  const storyIds = storyId ? [storyId] : writerStories.map((s) => s.story_id);

  if (!storyIds.length) {
    return {
      sentiment_breakdown: { hype: 0, emotional: 0, analytical: 0, critic: 0, neutral: 0 },
      questions: [],
      word_cloud: [],
      top_contributors: [],
      reply_rate: null,
      total_comments: 0,
      chapter_sentiment: [],
      character_mentions: [],
    };
  }

  const comments = await prisma.comments.findMany({
    where: {
      story_id: { in: storyIds },
      is_deleted: false,
      created_at: { gte: since },
    },
    include: {
      user: { select: { user_id: true, profile: { select: { handle_name: true, nickname: true } } } },
      chapter: { select: { chapter_id: true, title: true, order_index: true } },
    },
    orderBy: { created_at: "desc" },
    take: 5000,
  });

  const sentimentCounts = { hype: 0, emotional: 0, analytical: 0, critic: 0, neutral: 0 };
  const questions = [];
  const wordFreq = new Map();
  const contributorCounts = new Map();
  const chapterSentiment = new Map();

  for (const c of comments) {
    const sentiment = classifySentiment(c.body);
    sentimentCounts[sentiment] = (sentimentCounts[sentiment] || 0) + 1;

    if (isQuestion(c.body)) {
      questions.push({
        comment_id: c.comment_id,
        body: c.body.slice(0, 200),
        user: c.user?.profile?.handle_name || c.user?.profile?.nickname || `User ${c.user_id}`,
        chapter_title: c.chapter?.title || null,
        created_at: c.created_at,
      });
    }

    for (const word of extractWords(c.body)) {
      wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
    }

    const uKey = c.user_id;
    contributorCounts.set(uKey, (contributorCounts.get(uKey) || 0) + 1);

    if (c.chapter_id) {
      if (!chapterSentiment.has(c.chapter_id)) {
        chapterSentiment.set(c.chapter_id, {
          chapter_id: c.chapter_id,
          title: c.chapter?.title,
          order_index: c.chapter?.order_index,
          hype: 0,
          emotional: 0,
          analytical: 0,
          critic: 0,
          neutral: 0,
          total: 0,
        });
      }
      const cs = chapterSentiment.get(c.chapter_id);
      cs[sentiment] += 1;
      cs.total += 1;
    }
  }

  const wordCloud = Array.from(wordFreq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 60)
    .map(([word, count]) => ({ word, count }));

  const contributorIds = Array.from(contributorCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([uid]) => uid);

  const contributorProfiles = await prisma.user_profiles.findMany({
    where: { user_id: { in: contributorIds } },
    select: { user_id: true, handle_name: true, nickname: true, profile_image: true },
  });
  const profileMap = new Map(contributorProfiles.map((p) => [p.user_id, p]));

  const topContributors = contributorIds.map((uid) => {
    const p = profileMap.get(uid);
    return {
      user_id: uid,
      handle_name: p?.handle_name || p?.nickname || `User ${uid}`,
      profile_image: p?.profile_image || null,
      comment_count: contributorCounts.get(uid),
    };
  });

  const writerReplies = comments.filter((c) => c.user_id === writerId && c.parent_id !== null).length;
  const nonWriterComments = comments.filter((c) => c.user_id !== writerId && c.parent_id === null).length;
  const replyRate = nonWriterComments ? writerReplies / nonWriterComments : null;

  const chapterSentimentArr = Array.from(chapterSentiment.values()).sort(
    (a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)
  );

  const characterMentions = await extractCharacterMentions(comments, storyIds);

  return {
    sentiment_breakdown: sentimentCounts,
    questions: questions.slice(0, 20),
    word_cloud: wordCloud,
    top_contributors: topContributors,
    reply_rate: replyRate,
    total_comments: comments.length,
    chapter_sentiment: chapterSentimentArr,
    character_mentions: characterMentions,
  };
}

async function extractCharacterMentions(comments, storyIds) {
  try {
    const moodboards = await prisma.moodboards.findMany({
      where: { story_id: { in: storyIds }, is_deleted: false },
      select: { characters: { select: { name: true } } },
    });

    const characterNames = new Set();
    for (const mb of moodboards) {
      for (const ch of mb.characters || []) {
        if (ch.name && ch.name.length > 2) characterNames.add(ch.name.toLowerCase());
      }
    }

    if (!characterNames.size) return [];

    const counts = new Map();
    for (const c of comments) {
      const lower = (c.body || "").toLowerCase();
      for (const name of characterNames) {
        const regex = new RegExp(`\\b${name}\\b`, "gi");
        const matches = lower.match(regex);
        if (matches) counts.set(name, (counts.get(name) || 0) + matches.length);
      }
    }

    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));
  } catch {
    return [];
  }
}

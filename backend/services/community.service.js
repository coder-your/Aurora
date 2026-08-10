export const COMMUNITY_CATEGORIES = [
  "general",
  "book-reviews",
  "writing-advice",
  "chapter-discussions",
  "adaptation-talk",
  "off-topic",
];

export const SIDEBAR_GENRES = [
  "Romance",
  "Fantasy",
  "Mystery",
  "Thriller",
  "Poetry",
  "General Fiction",
];

export const GENRE_DB_MAP = {
  "Literary Fiction": "General Fiction",
};

export const resolveGenreName = (genre) => {
  const raw = String(genre || "").trim();
  if (!raw) return null;
  return GENRE_DB_MAP[raw] || raw;
};

export const normalizeCommunityCategory = (category) => {
  const normalized = String(category || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-");

  if (!normalized) return "general";
  return COMMUNITY_CATEGORIES.includes(normalized) ? normalized : "general";
};

export const formatCommunityCategory = (category) => {
  const normalized = normalizeCommunityCategory(category);
  const labels = {
    general: "General",
    "book-reviews": "Book Reviews",
    "writing-advice": "Writing Advice",
    "chapter-discussions": "Chapter Discussions",
    "adaptation-talk": "Adaptation Talk",
    "off-topic": "Off Topic",
  };
  return labels[normalized] || "General";
};

export const WRITING_CATEGORIES = ["writing-advice", "chapter-discussions"];

export const extractHashtags = (text) => {
  if (!text) return [];
  const matches = String(text).match(/#[\w-]+/g);
  return matches ? matches.map((tag) => tag.toLowerCase()) : [];
};

export const sortCommunityThreads = (threads, sort = "latest") => {
  const list = [...threads];

  if (sort === "most-discussed") {
    return list.sort((a, b) => (b.replies?.length || 0) - (a.replies?.length || 0));
  }

  if (sort === "trending") {
    const score = (thread) => {
      const votes = (thread.upvotes || 0) - (thread.downvotes || 0);
      const replies = thread.replies?.length || 0;
      const ageHours = Math.max(1, (Date.now() - new Date(thread.created_at).getTime()) / 3_600_000);
      const recency = 1 / Math.pow(ageHours, 0.6);
      return votes * 2 + replies * 3 + recency * 8 + (thread.is_pinned ? 20 : 0);
    };
    return list.sort((a, b) => score(b) - score(a));
  }

  if (sort === "top") {
    const score = (thread) => (thread.upvotes || 0) - (thread.downvotes || 0);
    return list.sort((a, b) => score(b) - score(a));
  }

  return list.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
};

export const buildThreadWhere = ({
  view = "all",
  genre,
  authorId,
  storyId,
  categoryFilter,
  followingTargets = [],
  followedAuthorIds = [],
}) => {
  const where = { is_deleted: false };
  const and = [];

  if (view === "writing") {
    and.push({ category: { in: WRITING_CATEGORIES } });
  }

  if (view === "following") {
    const or = [];
    if (followingTargets.length) {
      followingTargets.forEach(({ channel_type, target_id }) => {
        or.push({ channel_type, target_id });
      });
    }
    if (followedAuthorIds.length) {
      or.push({ story: { author_id: { in: followedAuthorIds } } });
      or.push({ channel_type: "Author", target_id: { in: followedAuthorIds } });
    }
    if (!or.length) {
      return { impossible: true };
    }
    and.push({ OR: or });
  }

  if (genre) {
    const resolved = resolveGenreName(genre);
    and.push({
      OR: [
        { story: { category: resolved } },
        { channel_type: "Genre", flair: resolved },
      ],
    });
  }

  if (authorId) {
    and.push({
      OR: [
        { channel_type: "Author", target_id: authorId },
        { story: { author_id: authorId } },
      ],
    });
  }

  if (storyId) {
    and.push({
      OR: [{ story_id: storyId }, { channel_type: "Book", target_id: storyId }],
    });
  }

  if (categoryFilter && categoryFilter !== "all") {
    and.push({ category: normalizeCommunityCategory(categoryFilter) });
  }

  if (and.length) {
    where.AND = and;
  }

  return where;
};

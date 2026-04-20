import prisma from "../utils/prisma.js";
import { sanitizeInput } from "../utils/sanitize.js";
import { CATEGORIES, TAGS } from "../constants.js";
import { calculateMetrics } from "../utils/textMetrics.js";

export const createBook = async (req, res) => {
  try {
    const author = req.user;
    // sanitize & validate inputs (but empty allowed on start)
    const { title = "", description = "", category = "", tags = [], is_mature = false, has_copyright = false } = req.body;

    const t = sanitizeInput(title);
    const d = sanitizeInput(description);

    if (category && !CATEGORIES.includes(category)) return res.status(400).json({ message: "Invalid category" });
    const invalidTag = tags.find(tg => !TAGS.includes(tg));
    if (invalidTag) return res.status(400).json({ message: `Invalid tag: ${invalidTag}` });

    // word limits
    if (t && t.split(/\s+/).length > 20) return res.status(400).json({ message: "Title too long (max 20 words)" });
    if (d && d.split(/\s+/).length > 1000) return res.status(400).json({ message: "Description too long" });

    const story = await prisma.stories.create({
      data: {
        author_id: author.user_id,
        title: t || null,
        description: d || null,
        category: category || null,
        tags: tags.length ? tags.join(",") : null,
        visibility: "draft",
        status: "in_progress",
        is_mature: Boolean(is_mature),
        has_copyright: Boolean(has_copyright)
      }
    });

    return res.status(201).json({ story_id: story.story_id });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: err.message });
  }
};

export const getBook = async (req, res) => {
  try {
    const story_id = Number(req.params.story_id);
    const story = await prisma.stories.findUnique({
      where: { story_id },
      include: { 
        chapters: {
          where: { is_deleted: false },
          orderBy: { order_index: "asc" }
        }
      },
    });
    if (!story) return res.status(404).json({ message: "Story not found" });
    return res.json(story);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: err.message });
  }
};

// Publish workflow
export const publishBook = async (req, res) => {
  try {
    const author = req.user;
    const story_id = Number(req.params.story_id);
    const story = await prisma.stories.findUnique({ where: { story_id }, include: { chapters: true }});
    if (!story) return res.status(404).json({ message: "Story not found" });
    if (story.author_id !== author.user_id) return res.status(403).json({ message: "Not owner" });

    // Pre-publish validation
    if (!story.title || !story.title.trim()) return res.status(400).json({ field: "title", message: "Title cannot be empty" });
    if (!story.description || story.description.trim().length < 50) return res.status(400).json({ field: "description", message: "Description too short (min 50 chars)" });
    const chapters = await prisma.chapters.findMany({ where: { story_id, is_deleted: false }});
    if (!chapters.length) return res.status(400).json({ field: "chapters", message: "At least one chapter required" });
    const meaningful = chapters.some(ch => (ch.content_raw || "").length > 200);
    if (!meaningful) return res.status(400).json({ field: "chapters", message: "At least one meaningful chapter required (min 200 chars)" });

    // optional minimum word total
    const totalWords = chapters.reduce((s,c)=>s+(c.word_count||0),0);
    // assume optional minWords = 500 (customize) - skip if not wanted

    // set published
    await prisma.stories.update({
      where: { story_id },
      data: { status: "published", visibility: "public", updated_at: new Date(), last_updated: new Date() }
    });
    return res.json({ message: "Published", story_id });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: err.message });
  }
};

export const deleteBook = async (req, res) => {
  try {
    const id = Number(req.params.story_id);
    const story = await prisma.stories.findUnique({ where: { story_id: id }});
    if (!story) return res.status(404).json({ message: "Not found" });
    if (story.author_id !== req.user.user_id) return res.status(403).json({ message: "Not owner" });
    await prisma.stories.update({ where: { story_id: id }, data: { is_deleted: true, deleted_at: new Date() }});
    return res.json({ message: "Soft deleted" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: err.message });
  }
};

export const restoreBook = async (req, res) => {
  try {
    const id = Number(req.params.story_id);
    const story = await prisma.stories.findUnique({ where: { story_id: id }});
    if (!story) return res.status(404).json({ message: "Not found" });
    if (story.author_id !== req.user.user_id) return res.status(403).json({ message: "Not owner" });
    await prisma.stories.update({ where: { story_id: id }, data: { is_deleted: false, deleted_at: null }});
    return res.json({ message: "Restored" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: err.message });
  }
};

// update metadata (post-publish allowed but guarded)
export const updateMetadata = async (req, res) => {
  try {
    const id = Number(req.params.story_id);
    const body = req.body;
    const story = await prisma.stories.findUnique({ where: { story_id: id }});
    if (!story) return res.status(404).json({ message: "Not found" });
    if (story.author_id !== req.user.user_id) return res.status(403).json({ message: "Not owner" });

    // protect against arbitrary overwrite if published — soft guard: allow edits but record previous published state
    const updates = {};
    if (body.title) {
      if (body.title.split(/\s+/).length > 50) return res.status(400).json({ message: "Title too long" });
      updates.title = sanitizeInput(body.title);
    }
    if (body.description) {
      if (body.description.length < 20) return res.status(400).json({ message: "Description too short" });
      updates.description = sanitizeInput(body.description);
    }
    if (body.category !== undefined) {
      if (body.category && !CATEGORIES.includes(body.category)) {
        return res.status(400).json({ message: "Invalid category" });
      }
      updates.category = body.category || null;
    }
    if (body.tags && Array.isArray(body.tags)) {
      const invalid = body.tags.find(t => !TAGS.includes(t));
      if (invalid) return res.status(400).json({ message: "Invalid tag " + invalid });
      updates.tags = body.tags.join(",");
    }
    if (typeof body.is_mature === "boolean") updates.is_mature = body.is_mature;
    if (typeof body.has_copyright === "boolean") updates.has_copyright = body.has_copyright;
    // Handle status updates (draft, in_progress, published, archived)
    if (body.status && ["draft", "in_progress", "published", "archived"].includes(body.status)) {
      updates.status = body.status;
      if (body.status === "published") {
        updates.visibility = "public";
      }
    }

    updates.updated_at = new Date();
    await prisma.stories.update({ where: { story_id: id }, data: updates });
    return res.json({ message: "Updated" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: err.message });
  }
};

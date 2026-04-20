import prisma from "../utils/prisma.js";
import { sanitizeInput } from "../utils/sanitize.js";

const ensurePublishedStoryByChapterId = async (chapterId) => {
  const chapter = await prisma.chapters.findUnique({
    where: { chapter_id: chapterId },
    select: { chapter_id: true, story_id: true },
  });

  if (!chapter) return { error: { status: 404, message: "Chapter not found" } };

  const story = await prisma.stories.findUnique({
    where: { story_id: chapter.story_id },
    select: { story_id: true, status: true, visibility: true, is_deleted: true },
  });

  if (!story || story.is_deleted) return { error: { status: 404, message: "Story not found" } };
  if (story.status !== "published" || story.visibility !== "public") {
    return { error: { status: 403, message: "Not available" } };
  }

  return { story, chapter };
};

export const upsertAuthorNote = async (req, res) => {
  try {
    const authorId = req.user.user_id;
    const chapterId = Number(req.params.chapterId);
    if (!chapterId) return res.status(400).json({ message: "Invalid chapterId" });

    const placementRaw = (req.body?.placement || "").toString().trim().toLowerCase();
    const placement = placementRaw === "before" || placementRaw === "after" ? placementRaw : null;
    if (!placement) return res.status(400).json({ message: "placement must be before or after" });

    const chapter = await prisma.chapters.findUnique({
      where: { chapter_id: chapterId },
      select: { chapter_id: true, author_id: true },
    });

    if (!chapter) return res.status(404).json({ message: "Chapter not found" });
    if (chapter.author_id !== authorId) return res.status(403).json({ message: "Not allowed" });

    const bodyRaw = (req.body?.body || "").toString();
    const body = sanitizeInput(bodyRaw).trim();
    if (!body) return res.status(400).json({ message: "body is required" });

    const saved = await prisma.chapter_author_notes.upsert({
      where: { chapter_id_placement: { chapter_id: chapterId, placement } },
      update: { body, updated_at: new Date() },
      create: { chapter_id: chapterId, author_id: authorId, placement, body },
    });

    return res.status(201).json(saved);
  } catch (err) {
    console.error("upsertAuthorNote error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const deleteAuthorNote = async (req, res) => {
  try {
    const authorId = req.user.user_id;
    const chapterId = Number(req.params.chapterId);
    if (!chapterId) return res.status(400).json({ message: "Invalid chapterId" });

    const placementRaw = (req.query.placement || "").toString().trim().toLowerCase();
    const placement = placementRaw === "before" || placementRaw === "after" ? placementRaw : null;
    if (!placement) return res.status(400).json({ message: "placement must be before or after" });

    const chapter = await prisma.chapters.findUnique({
      where: { chapter_id: chapterId },
      select: { chapter_id: true, author_id: true },
    });

    if (!chapter) return res.status(404).json({ message: "Chapter not found" });
    if (chapter.author_id !== authorId) return res.status(403).json({ message: "Not allowed" });

    await prisma.chapter_author_notes.deleteMany({ where: { chapter_id: chapterId, placement } });

    return res.json({ success: true });
  } catch (err) {
    console.error("deleteAuthorNote error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getChapterAuthorNotes = async (req, res) => {
  try {
    const chapterId = Number(req.params.chapterId);
    if (!chapterId) return res.status(400).json({ message: "Invalid chapterId" });

    const { error } = await ensurePublishedStoryByChapterId(chapterId);
    if (error) return res.status(error.status).json({ message: error.message });

    const notes = await prisma.chapter_author_notes.findMany({
      where: { chapter_id: chapterId },
      orderBy: { updated_at: "desc" },
    });

    return res.json({ notes });
  } catch (err) {
    console.error("getChapterAuthorNotes error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

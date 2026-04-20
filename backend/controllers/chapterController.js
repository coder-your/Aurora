import prisma from "../utils/prisma.js";
import { sanitizeInput } from "../utils/sanitize.js";
import { calculateMetrics } from "../utils/textMetrics.js";
import { createChapterVersionIfNeeded } from "../services/versionService.js";
import { makeSignature } from "../utils/hmac.js";

export const createChapter = async (req, res) => {
  try {
    const { story_id } = req.params;
    const author = req.user;
    const story = await prisma.stories.findUnique({ where: { story_id: Number(story_id) }});
    if (!story) return res.status(404).json({ message: "Story not found" });
    if (story.author_id !== author.user_id) return res.status(403).json({ message: "Not owner" });

    const { title = "" } = req.body;
    const sanitizedTitle = sanitizeInput(title);
    // determine order index
    const last = await prisma.chapters.findFirst({ where: { story_id: Number(story_id) }, orderBy: { order_index: "desc" }});
    const order_index = last ? last.order_index + 1 : 1;

    const chapter = await prisma.chapters.create({
      data: {
        story_id: Number(story_id),
        author_id: author.user_id,
        title: sanitizedTitle || null,
        order_index
      }
    });

    // update story totals
    await prisma.stories.update({
      where: { story_id: Number(story_id) },
      data: { total_chapters: { increment: 1 }, updated_at: new Date() }
    });

    return res.status(201).json({ chapter_id: chapter.chapter_id });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: err.message });
  }
};

export const deleteVersion = async (req, res) => {
  try {
    const versionId = Number(req.params.version_id);
    const v = await prisma.chapter_versions.findUnique({ where: { version_id: versionId } });
    if (!v) return res.status(404).json({ message: "Version not found" });

    // Ensure the requesting user is the author of this version
    if (v.author_id !== req.user.user_id) {
      return res.status(403).json({ message: "Not owner" });
    }

    await prisma.chapter_versions.delete({ where: { version_id: versionId } });
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: err.message });
  }
};

// Manually save a chapter version (full content) when writer clicks "Save Version"
export const saveManualVersion = async (req, res) => {
  try {
    const chapterId = Number(req.params.chapter_id);
    const author = req.user;

    const chapter = await prisma.chapters.findUnique({ where: { chapter_id: chapterId } });
    if (!chapter) return res.status(404).json({ message: "Chapter not found" });
    if (chapter.author_id !== author.user_id) return res.status(403).json({ message: "Not owner" });

    // Use current stored chapter content as snapshot source
    const raw = chapter.content_raw || "";
    const html = chapter.content_html || "";
    const delta = chapter.content_delta ? JSON.parse(chapter.content_delta) : null;

    await createChapterVersionIfNeeded({
      chapterId,
      author,
      newRaw: raw,
      newHtml: html,
      newDelta: delta,
      force: true,
    });

    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: err.message });
  }
};

export const autosaveChapter = async (req, res) => {
  try {
    const chapterId = Number(req.params.chapter_id);
    const { content_raw, content_delta } = req.body;
    const author = req.user;
    const chapter = await prisma.chapters.findUnique({ where: { chapter_id: chapterId }});
    if (!chapter) return res.status(404).json({ message: "Chapter not found" });
    if (chapter.author_id !== author.user_id) return res.status(403).json({ message: "Not owner" });

    const raw = sanitizeInput(content_raw || "");
    // For preview HTML: simple convert newline -> <p> or use markdown lib if markdown expected.
    const html = raw.split(/\n+/).map(p => `<p>${p}</p>`).join("");
    const deltaStr = content_delta ? JSON.stringify(content_delta) : null;
    const metrics = calculateMetrics(raw);

    // append copyright signature bottom if story flagged
    const story = await prisma.stories.findUnique({ where: { story_id: chapter.story_id }});
    let rawWithSig = raw;
    if (story?.has_copyright) {
      const authorName = `${author.first_name || ""} ${author.last_name || ""}`.trim() || author.email;
      const sig = makeSignature(authorName, raw);
      rawWithSig = `${raw}\n\n---\n${authorName}\nSignature: ${sig}`;
    }

    // update chapter always (autosave requirement)
    const updated = await prisma.chapters.update({
      where: { chapter_id: chapterId },
      data: {
        content_raw: rawWithSig,
        content_html: html,
        content_delta: deltaStr,
        word_count: metrics.word_count,
        char_count: metrics.char_count,
        paragraphs: metrics.paragraphs,
        reading_minutes: metrics.reading_minutes,
        updated_at: new Date()
      }
    });
     
    // also recalc book-level totals
    const chapters = await prisma.chapters.findMany({ where: { story_id: chapter.story_id, is_deleted: false }});
    const totalWords = chapters.reduce((s,c)=>s+(c.word_count||0),0);
    const totalChapters = chapters.length;
    const estimated = Math.max(1, Math.ceil(totalWords / 200));
    await prisma.stories.update({ where: { story_id: chapter.story_id }, data: { total_words: totalWords, total_chapters: totalChapters, estimated_minutes: estimated, last_updated: new Date() }});

    return res.json({ updated: true, chapter: updated });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: err.message });
  }
};

export const getChapterVersions = async (req, res) => {
  try {
    const chapterId = Number(req.params.chapter_id);
    const chapter = await prisma.chapters.findUnique({ where: { chapter_id: chapterId } });
    if (!chapter) return res.status(404).json({ message: "Chapter not found" });
    if (chapter.author_id !== req.user.user_id) return res.status(403).json({ message: "Not owner" });

    const versions = await prisma.chapter_versions.findMany({
      where: { chapter_id: chapterId },
      orderBy: { created_at: "desc" },
      take: 50
    });
    return res.json(versions);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: err.message });
  }
}; 
export const updateChapterTitle = async (req, res) => {
  try {
    const chapterId = Number(req.params.chapter_id);
    const { title } = req.body;
    if (!title) return res.status(400).json({ message: "Title required" });

    const chapter = await prisma.chapters.findUnique({ where: { chapter_id: chapterId } });
    if (!chapter) return res.status(404).json({ message: "Chapter not found" });
    if (chapter.author_id !== req.user.user_id) return res.status(403).json({ message: "Not owner" });

    const updated = await prisma.chapters.update({
      where: { chapter_id: chapterId },
      data: { title: title.trim() }
    });

    return res.json({ chapter: updated });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: err.message });
  }
};


export const restoreVersion = async (req, res) => {
  try {
    const { chapter_id } = req.params;
    const { version_id } = req.body;
    const v = await prisma.chapter_versions.findUnique({ where: { version_id: Number(version_id) }});
    if (!v || v.chapter_id !== Number(chapter_id)) return res.status(404).json({ message: "Version not found" });
    const chapter = await prisma.chapters.findUnique({ where: { chapter_id: Number(chapter_id) }});
    if (chapter.author_id !== req.user.user_id) return res.status(403).json({ message: "Not owner" });

    // restore
    await prisma.chapters.update({
      where: { chapter_id: Number(chapter_id) },
      data: {
        content_raw: v.content_raw,
        content_html: v.content_html,
        content_delta: v.content_delta,
        word_count: v.word_count,
        char_count: v.char_count,
        paragraphs: v.paragraphs,
        reading_minutes: v.reading_minutes,
        updated_at: new Date()
      }
    });

    return res.json({ message: "Restored" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: err.message });
  }
};

export const reorderChapters = async (req, res) => {
  try {
    const { story_id } = req.params;
    const { order } = req.body; // array of { chapter_id, order_index }
    const story = await prisma.stories.findUnique({ where: { story_id: Number(story_id) }});
    if (!story) return res.status(404).json({ message: "Story not found" });
    if (story.author_id !== req.user.user_id) return res.status(403).json({ message: "Not owner" });

    // Update each
    const updates = [];
    for (const item of order) {
      updates.push(prisma.chapters.update({ where: { chapter_id: Number(item.chapter_id) }, data: { order_index: Number(item.order_index) } }));
    }
    await Promise.all(updates);
    return res.json({ message: "Reordered" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: err.message });
  }
};

export const deleteChapter = async (req, res) => {
  try {
    const id = Number(req.params.chapter_id);
    const ch = await prisma.chapters.findUnique({ where: { chapter_id: id }});
    if (!ch) return res.status(404).json({ message: "Not found" });
    if (ch.author_id !== req.user.user_id) return res.status(403).json({ message: "Not owner" });
    await prisma.chapters.update({ where: { chapter_id: id }, data: { is_deleted: true, deleted_at: new Date() }});
    return res.json({ message: "Soft deleted" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: err.message });
  }
};

export const restoreChapter = async (req, res) => {
  try {
    const id = Number(req.params.chapter_id);
    const ch = await prisma.chapters.findUnique({ where: { chapter_id: id }});
    if (!ch) return res.status(404).json({ message: "Not found" });
    if (ch.author_id !== req.user.user_id) return res.status(403).json({ message: "Not owner" });
    await prisma.chapters.update({ where: { chapter_id: id }, data: { is_deleted: false, deleted_at: null }});
    return res.json({ message: "Restored" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: err.message });
  }
};

export const previewChapter = async (req, res) => {
  try {
    const id = Number(req.params.chapter_id);
    const ch = await prisma.chapters.findUnique({ where: { chapter_id: id }});
    if (!ch) return res.status(404).json({ message: "Not found" });
    // ensure sanitized HTML
    return res.json({ html: ch.content_html, raw: ch.content_raw });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: err.message });
  }
};



export const getStoryWithChapters = async (req, res) => {
  try {
    const storyId = Number(req.params.story_id);
    const story = await prisma.stories.findUnique({
      where: { story_id: storyId },
      include: {
        chapters: {
          where: { is_deleted: false },
          orderBy: { order_index: "asc" },
        },
      },
    });

    if (!story) return res.status(404).json({ message: "Story not found" });

    res.json({
      story_id: story.story_id,
      title: story.title,
      status: story.status || "draft",
      chapters: story.chapters.map(c => ({
        chapter_id: c.chapter_id,
        title: c.title,
        word_count: c.word_count,
        order_index: c.order_index,
        updated_at: c.updated_at,
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};
export const updateBookStatus = async (req, res) => {
  try {
    const storyId = Number(req.params.story_id);
    const { status } = req.body; // draft, in_progress, published
    if (!status) return res.status(400).json({ message: "Status required" });

    const story = await prisma.stories.findUnique({ where: { story_id: storyId } });
    if (!story) return res.status(404).json({ message: "Story not found" });
    if (story.author_id !== req.user.user_id) return res.status(403).json({ message: "Not owner" });

    const updated = await prisma.stories.update({
      where: { story_id: storyId },
      data: { status, updated_at: new Date() },
    });

    res.json({ story_id: updated.story_id, status: updated.status });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};
export const publishBook = async (req, res) => {
  try {
    const storyId = Number(req.params.story_id);

    const story = await prisma.stories.findUnique({ where: { story_id: storyId } });
    if (!story) return res.status(404).json({ message: "Story not found" });
    if (story.author_id !== req.user.user_id) return res.status(403).json({ message: "Not owner" });

    const updated = await prisma.stories.update({
      where: { story_id: storyId },
      data: { status: "published", updated_at: new Date() },
    });

    res.json({ story_id: updated.story_id, status: updated.status });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

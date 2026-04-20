import prisma from "../utils/prisma.js";

const canReadStory = (story, userId) => {
  if (!story || story.is_deleted) return false;
  if (story.author_id && story.author_id === userId) return true;
  if (story.status === "published" && story.visibility === "public") return true;
  return false;
};

// Story introduction: core story data + reader context
export const getStoryIntro = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const storyId = Number(req.params.storyId);

    const story = await prisma.stories.findUnique({
      where: { story_id: storyId },
      include: {
        author: {
          select: {
            user_id: true,
            first_name: true,
            last_name: true,
            profile: {
              select: {
                handle_name: true,
              },
            },
          },
        },
        chapters: {
          where: { is_deleted: false },
          orderBy: { order_index: "asc" },
          select: {
            chapter_id: true,
            title: true,
            order_index: true,
            word_count: true,
          },
        },
      },
    });

    if (!story || story.is_deleted) {
      return res.status(404).json({ message: "Story not found" });
    }

    if (!canReadStory(story, userId)) {
      return res.status(403).json({ message: "You do not have access to read this story" });
    }

    const [history, position, bookmarksCount] = await Promise.all([
      prisma.user_read_history.findUnique({
        where: {
          user_id_story_id: { user_id: userId, story_id: storyId },
        },
      }),
      prisma.reading_positions.findUnique({
        where: {
          user_id_story_id: { user_id: userId, story_id: storyId },
        },
      }),
      prisma.bookmarks.count({
        where: { user_id: userId, story_id: storyId },
      }),
    ]);

    const authorProfile = story.author?.profile;
    const authorName =
      authorProfile?.handle_name ||
      [story.author?.first_name, story.author?.last_name].filter(Boolean).join(" ") ||
      "Unknown";

    return res.json({
      story: {
        story_id: story.story_id,
        title: story.title,
        description: story.description,
        cover_url: story.cover_url,
        status: story.status,
        category: story.category,
        tags: story.tags,
        total_chapters: story.total_chapters,
        author: {
          id: story.author?.user_id,
          name: authorName,
          handle: authorProfile?.handle_name || null,
        },
        chapters: story.chapters,
      },
      readerContext: {
        has_opened: !!history,
        progress: history?.progress ?? 0,
        last_position: position
          ? {
              chapter_id: position.chapter_id,
              position: position.position,
            }
          : null,
        bookmarks_count: bookmarksCount,
      },
    });
  } catch (err) {
    console.error("getStoryIntro error:", err);
    return res.status(500).json({ message: "Failed to load story intro" });
  }
};

// Determine which chapter/position to open (first time vs continue)
export const openReading = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const { storyId } = req.body;
    const story_id = Number(storyId);

    if (!story_id) {
      return res.status(400).json({ message: "storyId is required" });
    }

    const story = await prisma.stories.findUnique({ where: { story_id } });
    if (!story || story.is_deleted) {
      return res.status(404).json({ message: "Story not found" });
    }

    if (!canReadStory(story, userId)) {
      return res.status(403).json({ message: "You do not have access to read this story" });
    }

    // Existing reading position?
    let position = await prisma.reading_positions.findUnique({
      where: { user_id_story_id: { user_id: userId, story_id } },
    });

    let chapterIdToOpen;
    let startPosition = 0;

    if (position) {
      chapterIdToOpen = position.chapter_id;
      startPosition = position.position || 0;
    } else {
      const firstChapter = await prisma.chapters.findFirst({
        where: { story_id, is_deleted: false },
        orderBy: { order_index: "asc" },
      });

      if (!firstChapter) {
        return res.status(404).json({ message: "No chapters found for this story" });
      }

      chapterIdToOpen = firstChapter.chapter_id;
      startPosition = 0;

      // Initialize reading position row
      position = await prisma.reading_positions.create({
        data: {
          user_id: userId,
          story_id,
          chapter_id: chapterIdToOpen,
          position: 0,
        },
      });
    }

    // Ensure read history row exists
    await prisma.user_read_history.upsert({
      where: { user_id_story_id: { user_id: userId, story_id } },
      update: { last_read: new Date() },
      create: {
        user_id: userId,
        story_id,
        last_read: new Date(),
        progress: 0,
      },
    });

    const chapter = await prisma.chapters.findUnique({
      where: { chapter_id: chapterIdToOpen },
      select: {
        chapter_id: true,
        title: true,
        content_html: true,
        content_raw: true,
        order_index: true,
      },
    });

    if (!chapter) {
      return res.status(404).json({ message: "Chapter not found" });
    }

    return res.json({
      story_id,
      chapter,
      position: startPosition,
    });
  } catch (err) {
    console.error("openReading error:", err);
    const msg = (err && err.message) ? err.message : "";
    if (msg.toLowerCase().includes("does not exist") || msg.toLowerCase().includes("relation") || msg.toLowerCase().includes("table")) {
      return res.status(500).json({
        message: "Database tables for reading are not ready. Run Prisma migrate/db push then restart the server.",
        error: err.message,
      });
    }
    return res.status(500).json({ message: "Failed to open reading" });
  }
};

// Save reading progress (position + overall %)
export const updateProgress = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const { storyId, chapterId, position, chapterPercent } = req.body;
    const story_id = Number(storyId);
    const chapter_id = Number(chapterId);

    if (!story_id || !chapter_id) {
      return res.status(400).json({ message: "storyId and chapterId are required" });
    }

    // Update or create reading position
    await prisma.reading_positions.upsert({
      where: { user_id_story_id: { user_id: userId, story_id } },
      update: { chapter_id, position: position ?? 0, updated_at: new Date() },
      create: {
        user_id: userId,
        story_id,
        chapter_id,
        position: position ?? 0,
      },
    });

    // Update overall progress in user_read_history
    const history = await prisma.user_read_history.findUnique({
      where: { user_id_story_id: { user_id: userId, story_id } },
    });

    const newProgress = Math.max(
      history?.progress ?? 0,
      typeof chapterPercent === "number" ? chapterPercent : 0
    );

    await prisma.user_read_history.upsert({
      where: { user_id_story_id: { user_id: userId, story_id } },
      update: {
        last_read: new Date(),
        progress: newProgress,
      },
      create: {
        user_id: userId,
        story_id,
        last_read: new Date(),
        progress: newProgress,
      },
    });

    return res.json({ success: true });
  } catch (err) {
    console.error("updateProgress error:", err);
    return res.status(500).json({ message: "Failed to save progress" });
  }
};

// Add a bookmark at current position
export const addBookmark = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const { storyId, chapterId, position, note } = req.body;
    const story_id = Number(storyId);
    const chapter_id = Number(chapterId);

    if (!story_id || !chapter_id) {
      return res.status(400).json({ message: "storyId and chapterId are required" });
    }

    const bookmark = await prisma.bookmarks.create({
      data: {
        user_id: userId,
        story_id,
        chapter_id,
        position: position ?? 0,
        note: note || null,
      },
    });

    return res.status(201).json(bookmark);
  } catch (err) {
    console.error("addBookmark error:", err);
    return res.status(500).json({ message: "Failed to create bookmark" });
  }
};

// List bookmarks for a story
export const getBookmarks = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const storyId = Number(req.params.storyId);

    const bookmarks = await prisma.bookmarks.findMany({
      where: { user_id: userId, story_id: storyId },
      orderBy: { created_at: "asc" },
      include: {
        chapter: {
          select: {
            chapter_id: true,
            title: true,
            order_index: true,
          },
        },
      },
    });

    return res.json(bookmarks);
  } catch (err) {
    console.error("getBookmarks error:", err);
    return res.status(500).json({ message: "Failed to load bookmarks" });
  }
};

// Delete a bookmark
export const deleteBookmark = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const bookmarkId = Number(req.params.bookmarkId);

    const bookmark = await prisma.bookmarks.findUnique({ where: { id: bookmarkId } });
    if (!bookmark || bookmark.user_id !== userId) {
      return res.status(404).json({ message: "Bookmark not found" });
    }

    await prisma.bookmarks.delete({ where: { id: bookmarkId } });
    return res.json({ success: true });
  } catch (err) {
    console.error("deleteBookmark error:", err);
    return res.status(500).json({ message: "Failed to delete bookmark" });
  }
};

// Track daily reading minutes
export const addReadingSession = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const { storyId, minutesDelta } = req.body;
    const story_id = Number(storyId);
    const minutes = Number(minutesDelta) || 0;

    if (!story_id || minutes <= 0) {
      return res.status(400).json({ message: "storyId and positive minutesDelta are required" });
    }

    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    const session = await prisma.reading_sessions.findFirst({
      where: {
        user_id: userId,
        story_id,
        date: { gte: startOfDay },
      },
    });

    if (session) {
      await prisma.reading_sessions.update({
        where: { id: session.id },
        data: { minutes: session.minutes + minutes },
      });
    } else {
      await prisma.reading_sessions.create({
        data: {
          user_id: userId,
          story_id,
          minutes,
        },
      });
    }

    return res.json({ success: true });
  } catch (err) {
    console.error("addReadingSession error:", err);
    return res.status(500).json({ message: "Failed to track reading time" });
  }
};

// Get today's total minutes
export const getTodaySummary = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    const sessions = await prisma.reading_sessions.findMany({
      where: {
        user_id: userId,
        date: { gte: startOfDay },
      },
    });

    const minutesToday = sessions.reduce((sum, s) => sum + (s.minutes || 0), 0);

    return res.json({ minutesToday });
  } catch (err) {
    console.error("getTodaySummary error:", err);
    return res.status(500).json({ message: "Failed to load reading summary" });
  }
};

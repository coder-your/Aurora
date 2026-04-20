import prisma from "../utils/prisma.js";

// Build My Library view: TBR, current, finished
export const getLibrary = async (req, res) => {
  try {
    const userId = req.user.user_id;

    const safe = async (promise, fallback) => {
      try {
        return await promise;
      } catch (err) {
        console.warn("getLibrary partial fetch failed:", err.message);
        return fallback;
      }
    };

    const [tbrRows, historyRows, positions, bookmarkCounts] = await Promise.all([
      safe(prisma.to_be_read.findMany({ where: { user_id: userId } }), []),
      safe(prisma.user_read_history.findMany({ where: { user_id: userId } }), []),
      safe(prisma.reading_positions.findMany({ where: { user_id: userId } }), []),
      safe(
        prisma.bookmarks.groupBy({
          by: ["story_id"],
          where: { user_id: userId },
          _count: { story_id: true },
        }),
        []
      ),
    ]);

    const historyByStory = new Map(historyRows.map((h) => [h.story_id, h]));
    const posByStory = new Map(positions.map((p) => [p.story_id, p]));
    const bookmarkCountByStory = new Map(
      bookmarkCounts.map((b) => [b.story_id, b._count.story_id])
    );

    const tbrStoryIds = tbrRows.map((r) => r.story_id);
    const historyStoryIds = historyRows.map((h) => h.story_id);
    const allIds = Array.from(new Set([...tbrStoryIds, ...historyStoryIds]));

    if (!allIds.length) {
      return res.json({ tbr: [], current: [], finished: [] });
    }

    const stories = await safe(
      prisma.stories.findMany({
        where: { story_id: { in: allIds }, is_deleted: false },
        select: {
          story_id: true,
          title: true,
          cover_url: true,
          status: true,
          total_chapters: true,
        },
      }),
      []
    );

    const byId = new Map(stories.map((s) => [s.story_id, s]));

    const tbr = [];
    const current = [];
    const finished = [];

    for (const storyId of allIds) {
      const story = byId.get(storyId);
      if (!story) continue;

      const history = historyByStory.get(storyId) || null;
      const position = posByStory.get(storyId) || null;
      const bookmarksCount = bookmarkCountByStory.get(storyId) || 0;
      const inTbr = tbrStoryIds.includes(storyId);

      const item = {
        story_id: story.story_id,
        title: story.title,
        cover_url: story.cover_url,
        status: story.status,
        total_chapters: story.total_chapters,
        progress: history?.progress ?? 0,
        last_chapter_id: position?.chapter_id || null,
        bookmarks_count: bookmarksCount,
      };

      if (inTbr && (!history || (history.progress ?? 0) === 0)) {
        tbr.push(item);
      } else if (history && history.progress >= 100) {
        finished.push(item);
      } else if (history && history.progress > 0) {
        current.push(item);
      } else if (inTbr) {
        // safety: still put in TBR
        tbr.push(item);
      }
    }

    return res.json({ tbr, current, finished });
  } catch (err) {
    console.error("getLibrary error:", err);
    return res.status(500).json({ message: "Failed to load library", error: err.message });
  }
};

// Update a story's library status: "tbr" | "current" | "finished"
export const updateLibraryStatus = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const { storyId, target } = req.body;
    const story_id = Number(storyId);

    if (!story_id || !["tbr", "current", "finished"].includes(target)) {
      return res.status(400).json({ message: "storyId and valid target are required" });
    }

    const story = await prisma.stories.findUnique({ where: { story_id } });
    if (!story || story.is_deleted) {
      return res.status(404).json({ message: "Story not found" });
    }

    // Helper to upsert history with a given progress
    const setProgress = async (progress) => {
      await prisma.user_read_history.upsert({
        where: { user_id_story_id: { user_id: userId, story_id } },
        update: { progress, last_read: new Date() },
        create: { user_id: userId, story_id, progress, last_read: new Date() },
      });
    };

    if (target === "tbr") {
      // Ensure TBR row and reset progress to 0
      await prisma.to_be_read.upsert({
        where: { user_id_story_id: { user_id: userId, story_id } },
        update: {},
        create: { user_id: userId, story_id },
      });
      await setProgress(0);
    } else if (target === "current") {
      // Move to current: drop from TBR, set progress to mid value (50%)
      await prisma.to_be_read.deleteMany({ where: { user_id: userId, story_id } });
      await setProgress(50);
    } else if (target === "finished") {
      // Mark as finished: drop from TBR, set progress to 100%
      await prisma.to_be_read.deleteMany({ where: { user_id: userId, story_id } });
      await setProgress(100);
    }

    return res.json({ success: true });
  } catch (err) {
    console.error("updateLibraryStatus error:", err);
    return res.status(500).json({ message: "Failed to update library status" });
  }
};

// Completely remove a story from this user's library (all sections)
export const clearFromLibrary = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const storyId = Number(req.params.storyId);

    await prisma.to_be_read.deleteMany({ where: { user_id: userId, story_id: storyId } });
    await prisma.user_read_history.deleteMany({ where: { user_id: userId, story_id: storyId } });

    return res.json({ success: true });
  } catch (err) {
    console.error("clearFromLibrary error:", err);
    return res.status(500).json({ message: "Failed to remove from library" });
  }
};

// Add a story to TBR
export const addToTBR = async (req, res) => {
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

    const tbr = await prisma.to_be_read.upsert({
      where: { user_id_story_id: { user_id: userId, story_id } },
      update: {},
      create: { user_id: userId, story_id },
    });

    return res.status(201).json(tbr);
  } catch (err) {
    console.error("addToTBR error:", err);
    return res.status(500).json({ message: "Failed to add to TBR" });
  }
};

// Remove from TBR
export const removeFromTBR = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const storyId = Number(req.params.storyId);

    // Use deleteMany so we don't depend on a specific composite unique name
    await prisma.to_be_read.deleteMany({ where: { user_id: userId, story_id: storyId } });

    return res.json({ success: true });
  } catch (err) {
    console.error("removeFromTBR error:", err);
    return res.status(500).json({ message: "Failed to remove from TBR" });
  }
};

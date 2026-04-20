import prisma from "../utils/prisma.js";

const parseVibePanel = (panel) => {
  if (!panel) return null;
  return {
    ...panel,
    color_palette: panel.color_palette ? JSON.parse(panel.color_palette) : [],
    images: panel.images ? JSON.parse(panel.images) : [],
    themes: panel.themes ? JSON.parse(panel.themes) : [],
  };
};

const buildCoverImages = (mb) => {
  const urls = [];

  const vibeImages = Array.isArray(mb?.vibe_panel?.images) ? mb.vibe_panel.images : [];
  for (const img of vibeImages) {
    if (img?.url) urls.push(img.url);
  }

  const insp = Array.isArray(mb?.inspirations) ? mb.inspirations : [];
  for (const item of insp) {
    if (item?.url) urls.push(item.url);
  }

  const chars = Array.isArray(mb?.characters) ? mb.characters : [];
  for (const c of chars) {
    if (c?.image_url) urls.push(c.image_url);
  }

  const locs = Array.isArray(mb?.locations) ? mb.locations : [];
  for (const l of locs) {
    if (l?.image_url) urls.push(l.image_url);
  }

  const seen = new Set();
  const out = [];
  for (const u of urls) {
    if (!u || seen.has(u)) continue;
    seen.add(u);
    out.push(u);
    if (out.length >= 8) break;
  }
  return out;
};

// Create a new moodboard (writer only)
export const createMoodboard = async (req, res) => {
  try {
    const ownerId = req.user.user_id;
    const { title, description, data, visibility, story_id } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ message: "Title is required" });
    }

    let storyIdToUse = null;
    if (story_id !== undefined && story_id !== null) {
      const numeric = Number(story_id);
      if (!numeric || Number.isNaN(numeric)) {
        return res.status(400).json({ message: "Invalid story_id" });
      }

      const story = await prisma.stories.findFirst({
        where: { story_id: numeric, author_id: ownerId, is_deleted: false },
        select: { story_id: true },
      });

      if (!story) {
        return res.status(404).json({ message: "Story not found or not owned by user" });
      }
      storyIdToUse = story.story_id;
    }

    const moodboard = await prisma.moodboards.create({
      data: {
        owner_id: ownerId,
        story_id: storyIdToUse,
        title: title.trim(),
        description: description || null,
        data: data ? JSON.stringify(data) : null,
        visibility: visibility === "public" ? "public" : "private",
      },
    });

    
    const vp = parseVibePanel(moodboard.vibe_panel);
    const cover_images = buildCoverImages({
      ...moodboard,
      vibe_panel: vp,
    });

    const parsed = {
      ...moodboard,
      data: moodboard.data ? JSON.parse(moodboard.data) : null,
      vibe_panel: vp,
      cover_images,
    };

    return res.status(201).json(parsed);
  } catch (error) {
    console.error("createMoodboard error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Public: list all public moodboards (for reader Discover)
export const getPublicMoodboards = async (req, res) => {
  try {
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
    const skip = Math.max(0, Number(req.query.skip) || 0);

    const moodboards = await prisma.moodboards.findMany({
      where: {
        visibility: "public",
        is_deleted: false,
      },
      include: {
        vibe_panel: true,
        inspirations: { select: { url: true }, where: { url: { not: null } } },
        characters: { select: { image_url: true }, where: { image_url: { not: null } } },
        locations: { select: { image_url: true }, where: { image_url: { not: null } } },
        owner: {
          select: {
            user_id: true,
            first_name: true,
            last_name: true,
            profile: { select: { handle_name: true, profile_image: true } },
          },
        },
        story: {
          select: { story_id: true, title: true, status: true, visibility: true, cover_url: true },
        },
      },
      orderBy: { updated_at: "desc" },
      skip,
      take: limit,
    });

    const parsed = moodboards.map((mb) => {
      const vp = parseVibePanel(mb.vibe_panel);
      const cover_images = buildCoverImages({
        ...mb,
        vibe_panel: vp,
      });

      return {
        ...mb,
        data: mb.data ? JSON.parse(mb.data) : null,
        vibe_panel: vp,
        cover_images,
      };
    });

    return res.json({ moodboards: parsed, skip, limit });
  } catch (error) {
    console.error("getPublicMoodboards error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Get all moodboards for the authenticated writer (including private)
export const getMyMoodboards = async (req, res) => {
  try {
    const ownerId = req.user.user_id;
    const storyId = req.query.storyId ? Number(req.query.storyId) : null;

    const sort = (req.query.sort || "updated").toString();

    const orderBy =
      sort === "created"
        ? { created_at: "desc" }
        : sort === "alpha"
          ? { title: "asc" }
          : { updated_at: "desc" };

    const moodboards = await prisma.moodboards.findMany({
      where: {
        owner_id: ownerId,
        is_deleted: false,
        ...(storyId ? { story_id: storyId } : {}),
      },
      include: {
        vibe_panel: true,
        inspirations: { select: { url: true }, where: { url: { not: null } } },
        characters: { select: { image_url: true }, where: { image_url: { not: null } } },
        locations: { select: { image_url: true }, where: { image_url: { not: null } } },
        story: {
          select: { story_id: true, title: true, status: true, visibility: true },
        },
      },
      orderBy,
    });

    const parsed = moodboards.map((mb) => {
      const vp = parseVibePanel(mb.vibe_panel);
      const cover_images = buildCoverImages({
        ...mb,
        vibe_panel: vp,
      });

      return {
        ...mb,
        data: mb.data ? JSON.parse(mb.data) : null,
        vibe_panel: vp,
        cover_images,
      };
    });

    return res.json(parsed);
  } catch (error) {
    console.error("getMyMoodboards error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Get single moodboard by id
// - Owner can see even if private
// - Others can see only if visibility === "public" and not deleted
export const getMoodboardById = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid id" });

    const moodboard = await prisma.moodboards.findUnique({
      where: { moodboard_id: id },
      include: {
        vibe_panel: true,
        inspirations: {
          select: { id: true, type: true, title: true, source: true, url: true, content: true, meta: true },
          orderBy: { id: "desc" },
        },
        characters: { select: { image_url: true }, where: { image_url: { not: null } } },
        locations: { select: { image_url: true }, where: { image_url: { not: null } } },
        story: {
          select: { story_id: true, title: true, status: true, visibility: true, cover_url: true },
        },
        owner: {
          select: {
            user_id: true,
            first_name: true,
            last_name: true,
            profile: { select: { handle_name: true, profile_image: true } },
          },
        },
      },
    });

    if (!moodboard || moodboard.is_deleted) {
      return res.status(404).json({ message: "Moodboard not found" });
    }

    const requesterId = req.user?.user_id;

    if (moodboard.visibility !== "public" && requesterId !== moodboard.owner_id) {
      return res.status(403).json({ message: "This moodboard is private" });
    }

    const vp = parseVibePanel(moodboard.vibe_panel);
    const cover_images = buildCoverImages({
      ...moodboard,
      vibe_panel: vp,
    });

    const parsed = {
      ...moodboard,
      data: moodboard.data ? JSON.parse(moodboard.data) : null,
      vibe_panel: vp,
      cover_images,
    };

    return res.json(parsed);
  } catch (error) {
    console.error("getMoodboardById error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Update moodboard (owner only)
export const updateMoodboard = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid id" });

    const existing = await prisma.moodboards.findUnique({
      where: { moodboard_id: id },
    });

    if (!existing || existing.is_deleted) {
      return res.status(404).json({ message: "Moodboard not found" });
    }

    if (existing.owner_id !== req.user.user_id) {
      return res.status(403).json({ message: "Not allowed" });
    }

    const { title, description, data, visibility, story_id } = req.body;

    let storyIdToUse;
    if (story_id !== undefined) {
      if (story_id === null || story_id === "") {
        storyIdToUse = null;
      } else {
        const numeric = Number(story_id);
        if (!numeric || Number.isNaN(numeric)) {
          return res.status(400).json({ message: "Invalid story_id" });
        }

        const story = await prisma.stories.findFirst({
          where: { story_id: numeric, author_id: req.user.user_id, is_deleted: false },
          select: { story_id: true },
        });

        if (!story) {
          return res.status(404).json({ message: "Story not found or not owned by user" });
        }

        storyIdToUse = story.story_id;
      }
    }

    const updated = await prisma.moodboards.update({
      where: { moodboard_id: id },
      data: {
        ...(title !== undefined && { title: title.trim() }),
        ...(description !== undefined && { description }),
        ...(data !== undefined && { data: data ? JSON.stringify(data) : null }),
        ...(visibility !== undefined && {
          visibility: visibility === "public" ? "public" : "private",
        }),
        ...(story_id !== undefined && { story_id: storyIdToUse }),
        updated_at: new Date(),
      },
      include: {
        vibe_panel: true,
        story: {
          select: { story_id: true, title: true, status: true, visibility: true },
        },
      },
    });

    const parsed = {
      ...updated,
      data: updated.data ? JSON.parse(updated.data) : null,
      vibe_panel: parseVibePanel(updated.vibe_panel),
    };

    return res.json(parsed);
  } catch (error) {
    console.error("updateMoodboard error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Soft delete moodboard (owner only)
export const deleteMoodboard = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid id" });

    const existing = await prisma.moodboards.findUnique({
      where: { moodboard_id: id },
    });

    if (!existing || existing.is_deleted) {
      return res.status(404).json({ message: "Moodboard not found" });
    }

    if (existing.owner_id !== req.user.user_id) {
      return res.status(403).json({ message: "Not allowed" });
    }

    await prisma.moodboards.update({
      where: { moodboard_id: id },
      data: { is_deleted: true, updated_at: new Date() },
    });

    return res.json({ message: "Moodboard deleted" });
  } catch (error) {
    console.error("deleteMoodboard error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Public: list all public moodboards for a given writer (by user id)
export const getPublicMoodboardsForUser = async (req, res) => {
  try {
    const ownerId = Number(req.params.userId);
    if (!ownerId) return res.status(400).json({ message: "Invalid user id" });

    const moodboards = await prisma.moodboards.findMany({
      where: {
        owner_id: ownerId,
        visibility: "public",
        is_deleted: false,
      },
      orderBy: { updated_at: "desc" },
      include: {
        characters: {
          select: { image_url: true },
          where: { image_url: { not: null } },
          take: 4,
        },
        inspirations: {
          select: { url: true, type: true },
          where: {
            url: { not: null },
            OR: [
              { type: { equals: "image", mode: "insensitive" } },
              { type: { contains: "image", mode: "insensitive" } },
            ],
          },
          take: 8,
        },
      },
    });

    const parsed = moodboards.map((mb) => {
      // Collect preview images from characters and inspirations
      const previewImages = [];
      if (mb.characters) {
        mb.characters.forEach((c) => {
          if (c.image_url) previewImages.push(c.image_url);
        });
      }
      if (mb.inspirations) {
        mb.inspirations.forEach((i) => {
          if (i.url) previewImages.push(i.url);
        });
      }

      const uniquePreviewImages = Array.from(new Set(previewImages)).slice(0, 4);

      return {
        ...mb,
        data: mb.data ? JSON.parse(mb.data) : null,
        previewImages: uniquePreviewImages,
      };
    });

    return res.json(parsed);
  } catch (error) {
    console.error("getPublicMoodboardsForUser error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

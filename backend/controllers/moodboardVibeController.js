import prisma from "../utils/prisma.js";

// Get vibe panel for a moodboard (respect visibility rules via parent)
export const getVibePanel = async (req, res) => {
  try {
    const moodboardId = Number(req.params.id);
    if (!moodboardId) return res.status(400).json({ message: "Invalid id" });

    const moodboard = await prisma.moodboards.findUnique({
      where: { moodboard_id: moodboardId },
    });

    if (!moodboard || moodboard.is_deleted) {
      return res.status(404).json({ message: "Moodboard not found" });
    }

    const requesterId = req.user?.user_id;
    if (moodboard.visibility !== "public" && requesterId !== moodboard.owner_id) {
      return res.status(403).json({ message: "This moodboard is private" });
    }

    const panel = await prisma.moodboard_vibe_panel.findUnique({
      where: { moodboard_id: moodboardId },
    });

    // Also surface some basic moodboard info (story_vibe, themes etc. come from panel)
    return res.json({ moodboard, panel });
  } catch (error) {
    console.error("getVibePanel error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Upsert vibe panel (writer/owner only)
export const upsertVibePanel = async (req, res) => {
  try {
    const moodboardId = Number(req.params.id);
    if (!moodboardId) return res.status(400).json({ message: "Invalid id" });

    const moodboard = await prisma.moodboards.findUnique({
      where: { moodboard_id: moodboardId },
    });

    if (!moodboard || moodboard.is_deleted) {
      return res.status(404).json({ message: "Moodboard not found" });
    }

    if (moodboard.owner_id !== req.user.user_id) {
      return res.status(403).json({ message: "Not allowed" });
    }

    const { color_palette, images, themes, vibe_summary, story_vibe } = req.body;

    // Build update object only with provided fields (don't overwrite existing with null)
    const updateData = {};
    const createData = { moodboard_id: moodboardId };

    if (color_palette !== undefined) {
      updateData.color_palette = color_palette ? (typeof color_palette === "string" ? color_palette : JSON.stringify(color_palette)) : null;
      createData.color_palette = updateData.color_palette;
    }
    if (images !== undefined) {
      updateData.images = images ? (typeof images === "string" ? images : JSON.stringify(images)) : null;
      createData.images = updateData.images;
    }
    if (themes !== undefined) {
      updateData.themes = themes ? (typeof themes === "string" ? themes : JSON.stringify(themes)) : null;
      createData.themes = updateData.themes;
    }
    if (vibe_summary !== undefined) {
      updateData.vibe_summary = vibe_summary;
      createData.vibe_summary = vibe_summary;
    }

    const panel = await prisma.moodboard_vibe_panel.upsert({
      where: { moodboard_id: moodboardId },
      update: updateData,
      create: createData,
    });

    // Optionally sync top-level story_vibe on moodboard
    if (story_vibe !== undefined) {
      await prisma.moodboards.update({
        where: { moodboard_id: moodboardId },
        data: { story_vibe, updated_at: new Date() },
      });
    }

    const parsed = {
      ...panel,
      color_palette: panel.color_palette ? JSON.parse(panel.color_palette) : null,
      images: panel.images ? JSON.parse(panel.images) : null,
      themes: panel.themes ? JSON.parse(panel.themes) : null,
    };

    return res.json(parsed);
  } catch (error) {
    console.error("upsertVibePanel error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

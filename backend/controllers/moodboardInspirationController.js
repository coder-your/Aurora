import prisma from "../utils/prisma.js";

const ensureMoodboardAccess = async (moodboardId, user, requireOwner = false) => {
  const moodboard = await prisma.moodboards.findUnique({
    where: { moodboard_id: moodboardId },
  });

  if (!moodboard || moodboard.is_deleted) {
    return { error: { status: 404, message: "Moodboard not found" } };
  }

  const requesterId = user?.user_id;

  if (requireOwner) {
    if (moodboard.owner_id !== requesterId) {
      return { error: { status: 403, message: "Not allowed" } };
    }
  } else if (moodboard.visibility !== "public" && requesterId !== moodboard.owner_id) {
    return { error: { status: 403, message: "This moodboard is private" } };
  }

  return { moodboard };
};

export const getInspirations = async (req, res) => {
  try {
    const moodboardId = Number(req.params.id);
    if (!moodboardId) return res.status(400).json({ message: "Invalid id" });

    const { error } = await ensureMoodboardAccess(moodboardId, req.user, false);
    if (error) return res.status(error.status).json({ message: error.message });

    const items = await prisma.moodboard_inspirations.findMany({
      where: { moodboard_id: moodboardId },
      orderBy: { id: "asc" },
    });

    const parsed = items.map((it) => ({
      ...it,
      meta: it.meta ? JSON.parse(it.meta) : null,
    }));

    return res.json(parsed);
  } catch (err) {
    console.error("getInspirations error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const createInspiration = async (req, res) => {
  try {
    const moodboardId = Number(req.params.id);
    if (!moodboardId) return res.status(400).json({ message: "Invalid id" });

    const { error } = await ensureMoodboardAccess(moodboardId, req.user, true);
    if (error) return res.status(error.status).json({ message: error.message });

    const { type, title, source, url, content, meta } = req.body;

    if (!type) return res.status(400).json({ message: "type is required" });

    const item = await prisma.moodboard_inspirations.create({
      data: {
        moodboard_id: moodboardId,
        type,
        title: title ?? null,
        source: source ?? null,
        url: url ?? null,
        content: content ?? null,
        meta: meta ? JSON.stringify(meta) : null,
      },
    });

    const parsed = {
      ...item,
      meta: item.meta ? JSON.parse(item.meta) : null,
    };

    return res.status(201).json(parsed);
  } catch (err) {
    console.error("createInspiration error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const updateInspiration = async (req, res) => {
  try {
    const itemId = Number(req.params.itemId);
    if (!itemId) return res.status(400).json({ message: "Invalid id" });

    const existing = await prisma.moodboard_inspirations.findUnique({ where: { id: itemId } });
    if (!existing) return res.status(404).json({ message: "Item not found" });

    const { error } = await ensureMoodboardAccess(existing.moodboard_id, req.user, true);
    if (error) return res.status(error.status).json({ message: error.message });

    const { type, title, source, url, content, meta } = req.body;

    const updated = await prisma.moodboard_inspirations.update({
      where: { id: itemId },
      data: {
        ...(type !== undefined && { type }),
        ...(title !== undefined && { title }),
        ...(source !== undefined && { source }),
        ...(url !== undefined && { url }),
        ...(content !== undefined && { content }),
        ...(meta !== undefined && { meta: meta ? JSON.stringify(meta) : null }),
      },
    });

    const parsed = {
      ...updated,
      meta: updated.meta ? JSON.parse(updated.meta) : null,
    };

    return res.json(parsed);
  } catch (err) {
    console.error("updateInspiration error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const deleteInspiration = async (req, res) => {
  try {
    const itemId = Number(req.params.itemId);
    if (!itemId) return res.status(400).json({ message: "Invalid id" });

    const existing = await prisma.moodboard_inspirations.findUnique({ where: { id: itemId } });
    if (!existing) return res.status(404).json({ message: "Item not found" });

    const { error } = await ensureMoodboardAccess(existing.moodboard_id, req.user, true);
    if (error) return res.status(error.status).json({ message: error.message });

    await prisma.moodboard_inspirations.delete({ where: { id: itemId } });

    return res.json({ message: "Item deleted" });
  } catch (err) {
    console.error("deleteInspiration error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

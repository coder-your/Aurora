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

// --------- World locations ---------

export const getLocations = async (req, res) => {
  try {
    const moodboardId = Number(req.params.id);
    if (!moodboardId) return res.status(400).json({ message: "Invalid id" });

    const { error } = await ensureMoodboardAccess(moodboardId, req.user, false);
    if (error) return res.status(error.status).json({ message: error.message });

    const locations = await prisma.moodboard_world_locations.findMany({
      where: { moodboard_id: moodboardId },
      orderBy: { id: "asc" },
    });

    return res.json(locations);
  } catch (err) {
    console.error("getLocations error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const createLocation = async (req, res) => {
  try {
    const moodboardId = Number(req.params.id);
    if (!moodboardId) return res.status(400).json({ message: "Invalid id" });

    const { error } = await ensureMoodboardAccess(moodboardId, req.user, true);
    if (error) return res.status(error.status).json({ message: error.message });

    const { name, kind, image_url, notes } = req.body;
    if (!name) return res.status(400).json({ message: "name is required" });

    const location = await prisma.moodboard_world_locations.create({
      data: {
        moodboard_id: moodboardId,
        name,
        kind: kind ?? null,
        image_url: image_url ?? null,
        notes: notes ?? null,
      },
    });

    return res.status(201).json(location);
  } catch (err) {
    console.error("createLocation error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const updateLocation = async (req, res) => {
  try {
    const locId = Number(req.params.locId);
    if (!locId) return res.status(400).json({ message: "Invalid id" });

    const existing = await prisma.moodboard_world_locations.findUnique({ where: { id: locId } });
    if (!existing) return res.status(404).json({ message: "Location not found" });

    const { error } = await ensureMoodboardAccess(existing.moodboard_id, req.user, true);
    if (error) return res.status(error.status).json({ message: error.message });

    const { name, kind, image_url, notes } = req.body;

    const updated = await prisma.moodboard_world_locations.update({
      where: { id: locId },
      data: {
        ...(name !== undefined && { name }),
        ...(kind !== undefined && { kind }),
        ...(image_url !== undefined && { image_url }),
        ...(notes !== undefined && { notes }),
      },
    });

    return res.json(updated);
  } catch (err) {
    console.error("updateLocation error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const deleteLocation = async (req, res) => {
  try {
    const locId = Number(req.params.locId);
    if (!locId) return res.status(400).json({ message: "Invalid id" });

    const existing = await prisma.moodboard_world_locations.findUnique({ where: { id: locId } });
    if (!existing) return res.status(404).json({ message: "Location not found" });

    const { error } = await ensureMoodboardAccess(existing.moodboard_id, req.user, true);
    if (error) return res.status(error.status).json({ message: error.message });

    await prisma.moodboard_world_locations.delete({ where: { id: locId } });

    return res.json({ message: "Location deleted" });
  } catch (err) {
    console.error("deleteLocation error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// --------- World meta (rules, culture, etc.) ---------

export const getWorldMeta = async (req, res) => {
  try {
    const moodboardId = Number(req.params.id);
    if (!moodboardId) return res.status(400).json({ message: "Invalid id" });

    const { error } = await ensureMoodboardAccess(moodboardId, req.user, false);
    if (error) return res.status(error.status).json({ message: error.message });

    const meta = await prisma.moodboard_world_meta.findUnique({
      where: { moodboard_id: moodboardId },
    });

    return res.json(meta || null);
  } catch (err) {
    console.error("getWorldMeta error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const upsertWorldMeta = async (req, res) => {
  try {
    const moodboardId = Number(req.params.id);
    if (!moodboardId) return res.status(400).json({ message: "Invalid id" });

    const { error } = await ensureMoodboardAccess(moodboardId, req.user, true);
    if (error) return res.status(error.status).json({ message: error.message });

    const { magic_rules, politics, society, culture_food, clothing } = req.body;

    const meta = await prisma.moodboard_world_meta.upsert({
      where: { moodboard_id: moodboardId },
      update: {
        magic_rules: magic_rules ?? null,
        politics: politics ?? null,
        society: society ?? null,
        culture_food: culture_food ?? null,
        clothing: clothing ?? null,
      },
      create: {
        moodboard_id: moodboardId,
        magic_rules: magic_rules ?? null,
        politics: politics ?? null,
        society: society ?? null,
        culture_food: culture_food ?? null,
        clothing: clothing ?? null,
      },
    });

    return res.json(meta);
  } catch (err) {
    console.error("upsertWorldMeta error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

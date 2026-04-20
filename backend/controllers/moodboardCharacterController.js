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

// --------- Characters CRUD (cards) ---------

export const getCharacters = async (req, res) => {
  try {
    const moodboardId = Number(req.params.id);
    if (!moodboardId) return res.status(400).json({ message: "Invalid id" });

    const { error } = await ensureMoodboardAccess(moodboardId, req.user, false);
    if (error) return res.status(error.status).json({ message: error.message });

    const chars = await prisma.moodboard_characters.findMany({
      where: { moodboard_id: moodboardId },
      orderBy: { id: "asc" },
    });

    return res.json(chars);
  } catch (err) {
    console.error("getCharacters error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const createCharacter = async (req, res) => {
  try {
    const moodboardId = Number(req.params.id);
    if (!moodboardId) return res.status(400).json({ message: "Invalid id" });

    const { error } = await ensureMoodboardAccess(moodboardId, req.user, true);
    if (error) return res.status(error.status).json({ message: error.message });

    const {
      name,
      age,
      role,
      image_url,
      introvert_extrovert,
      soft_fierce,
      chaotic_ordered,
      logical_emotional,
      backstory,
      extra_gallery,
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Name is required" });
    }

    const char = await prisma.moodboard_characters.create({
      data: {
        moodboard_id: moodboardId,
        name: name.trim(),
        age: age ?? null,
        role: role ?? null,
        image_url: image_url ?? null,
        introvert_extrovert: introvert_extrovert ?? 50,
        soft_fierce: soft_fierce ?? 50,
        chaotic_ordered: chaotic_ordered ?? 50,
        logical_emotional: logical_emotional ?? 50,
        backstory: backstory ?? null,
        extra_gallery: extra_gallery ? JSON.stringify(extra_gallery) : null,
      },
    });

    const parsed = {
      ...char,
      extra_gallery: char.extra_gallery ? JSON.parse(char.extra_gallery) : null,
    };

    return res.status(201).json(parsed);
  } catch (err) {
    console.error("createCharacter error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const updateCharacter = async (req, res) => {
  try {
    const charId = Number(req.params.charId);
    if (!charId) return res.status(400).json({ message: "Invalid id" });

    const existing = await prisma.moodboard_characters.findUnique({ where: { id: charId } });
    if (!existing) return res.status(404).json({ message: "Character not found" });

    const { error } = await ensureMoodboardAccess(existing.moodboard_id, req.user, true);
    if (error) return res.status(error.status).json({ message: error.message });

    const {
      name,
      age,
      role,
      image_url,
      introvert_extrovert,
      soft_fierce,
      chaotic_ordered,
      logical_emotional,
      backstory,
      extra_gallery,
    } = req.body;

    const updated = await prisma.moodboard_characters.update({
      where: { id: charId },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(age !== undefined && { age }),
        ...(role !== undefined && { role }),
        ...(image_url !== undefined && { image_url }),
        ...(introvert_extrovert !== undefined && { introvert_extrovert }),
        ...(soft_fierce !== undefined && { soft_fierce }),
        ...(chaotic_ordered !== undefined && { chaotic_ordered }),
        ...(logical_emotional !== undefined && { logical_emotional }),
        ...(backstory !== undefined && { backstory }),
        ...(extra_gallery !== undefined && {
          extra_gallery: extra_gallery ? JSON.stringify(extra_gallery) : null,
        }),
      },
    });

    const parsed = {
      ...updated,
      extra_gallery: updated.extra_gallery ? JSON.parse(updated.extra_gallery) : null,
    };

    return res.json(parsed);
  } catch (err) {
    console.error("updateCharacter error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const deleteCharacter = async (req, res) => {
  try {
    const charId = Number(req.params.charId);
    if (!charId) return res.status(400).json({ message: "Invalid id" });

    const existing = await prisma.moodboard_characters.findUnique({ where: { id: charId } });
    if (!existing) return res.status(404).json({ message: "Character not found" });

    const { error } = await ensureMoodboardAccess(existing.moodboard_id, req.user, true);
    if (error) return res.status(error.status).json({ message: error.message });

    await prisma.moodboard_characters.delete({ where: { id: charId } });

    return res.json({ message: "Character deleted" });
  } catch (err) {
    console.error("deleteCharacter error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// --------- Character Relationships ---------

export const getCharacterLinks = async (req, res) => {
  try {
    const moodboardId = Number(req.params.id);
    if (!moodboardId) return res.status(400).json({ message: "Invalid id" });

    const { error } = await ensureMoodboardAccess(moodboardId, req.user, false);
    if (error) return res.status(error.status).json({ message: error.message });

    const links = await prisma.moodboard_character_links.findMany({
      where: { moodboard_id: moodboardId },
      orderBy: { id: "asc" },
    });

    return res.json(links);
  } catch (err) {
    console.error("getCharacterLinks error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const createCharacterLink = async (req, res) => {
  try {
    const moodboardId = Number(req.params.id);
    if (!moodboardId) return res.status(400).json({ message: "Invalid id" });

    const { error } = await ensureMoodboardAccess(moodboardId, req.user, true);
    if (error) return res.status(error.status).json({ message: error.message });

    const { from_id, to_id, label, intensity } = req.body;

    if (!from_id || !to_id) {
      return res.status(400).json({ message: "from_id and to_id are required" });
    }

    const link = await prisma.moodboard_character_links.create({
      data: {
        moodboard_id: moodboardId,
        from_id,
        to_id,
        label: label ?? null,
        intensity: intensity ?? null,
      },
    });

    return res.status(201).json(link);
  } catch (err) {
    console.error("createCharacterLink error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const deleteCharacterLink = async (req, res) => {
  try {
    const linkId = Number(req.params.linkId);
    if (!linkId) return res.status(400).json({ message: "Invalid id" });

    const existing = await prisma.moodboard_character_links.findUnique({ where: { id: linkId } });
    if (!existing) return res.status(404).json({ message: "Link not found" });

    const { error } = await ensureMoodboardAccess(existing.moodboard_id, req.user, true);
    if (error) return res.status(error.status).json({ message: error.message });

    await prisma.moodboard_character_links.delete({ where: { id: linkId } });

    return res.json({ message: "Link deleted" });
  } catch (err) {
    console.error("deleteCharacterLink error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

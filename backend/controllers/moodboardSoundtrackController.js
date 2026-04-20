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

export const getTracks = async (req, res) => {
  try {
    const moodboardId = Number(req.params.id);
    if (!moodboardId) return res.status(400).json({ message: "Invalid id" });

    const { error } = await ensureMoodboardAccess(moodboardId, req.user, false);
    if (error) return res.status(error.status).json({ message: error.message });

    const tracks = await prisma.moodboard_tracks.findMany({
      where: { moodboard_id: moodboardId },
      orderBy: { id: "asc" },
    });

    return res.json(tracks);
  } catch (err) {
    console.error("getTracks error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const createTrack = async (req, res) => {
  try {
    const moodboardId = Number(req.params.id);
    if (!moodboardId) return res.status(400).json({ message: "Invalid id" });

    const { error } = await ensureMoodboardAccess(moodboardId, req.user, true);
    if (error) return res.status(error.status).json({ message: error.message });

    const { kind, label, spotify_id, spotify_url, ambient_tag, scene_label } = req.body;

    if (!kind) return res.status(400).json({ message: "kind is required" });

    const track = await prisma.moodboard_tracks.create({
      data: {
        moodboard_id: moodboardId,
        kind,
        label: label ?? null,
        spotify_id: spotify_id ?? null,
        spotify_url: spotify_url ?? null,
        ambient_tag: ambient_tag ?? null,
        scene_label: scene_label ?? null,
      },
    });

    return res.status(201).json(track);
  } catch (err) {
    console.error("createTrack error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const updateTrack = async (req, res) => {
  try {
    const trackId = Number(req.params.trackId);
    if (!trackId) return res.status(400).json({ message: "Invalid id" });

    const existing = await prisma.moodboard_tracks.findUnique({ where: { id: trackId } });
    if (!existing) return res.status(404).json({ message: "Track not found" });

    const { error } = await ensureMoodboardAccess(existing.moodboard_id, req.user, true);
    if (error) return res.status(error.status).json({ message: error.message });

    const { kind, label, spotify_id, spotify_url, ambient_tag, scene_label } = req.body;

    const updated = await prisma.moodboard_tracks.update({
      where: { id: trackId },
      data: {
        ...(kind !== undefined && { kind }),
        ...(label !== undefined && { label }),
        ...(spotify_id !== undefined && { spotify_id }),
        ...(spotify_url !== undefined && { spotify_url }),
        ...(ambient_tag !== undefined && { ambient_tag }),
        ...(scene_label !== undefined && { scene_label }),
      },
    });

    return res.json(updated);
  } catch (err) {
    console.error("updateTrack error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const deleteTrack = async (req, res) => {
  try {
    const trackId = Number(req.params.trackId);
    if (!trackId) return res.status(400).json({ message: "Invalid id" });

    const existing = await prisma.moodboard_tracks.findUnique({ where: { id: trackId } });
    if (!existing) return res.status(404).json({ message: "Track not found" });

    const { error } = await ensureMoodboardAccess(existing.moodboard_id, req.user, true);
    if (error) return res.status(error.status).json({ message: error.message });

    await prisma.moodboard_tracks.delete({ where: { id: trackId } });

    return res.json({ message: "Track deleted" });
  } catch (err) {
    console.error("deleteTrack error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

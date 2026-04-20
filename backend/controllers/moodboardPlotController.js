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

// --------- Sticky notes / plot wall ---------

export const getNotes = async (req, res) => {
  try {
    const moodboardId = Number(req.params.id);
    if (!moodboardId) return res.status(400).json({ message: "Invalid id" });

    const { error } = await ensureMoodboardAccess(moodboardId, req.user, false);
    if (error) return res.status(error.status).json({ message: error.message });

    const notes = await prisma.moodboard_notes.findMany({
      where: { moodboard_id: moodboardId },
      orderBy: { id: "asc" },
    });

    return res.json(notes);
  } catch (err) {
    console.error("getNotes error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const createNote = async (req, res) => {
  try {
    const moodboardId = Number(req.params.id);
    if (!moodboardId) return res.status(400).json({ message: "Invalid id" });

    const { error } = await ensureMoodboardAccess(moodboardId, req.user, true);
    if (error) return res.status(error.status).json({ message: error.message });

    const { kind, title, content, parent_id, pos_x, pos_y, color } = req.body;

    if (!kind) return res.status(400).json({ message: "kind is required" });

    const note = await prisma.moodboard_notes.create({
      data: {
        moodboard_id: moodboardId,
        kind,
        title: title ?? null,
        content: content ?? null,
        parent_id: parent_id ?? null,
        pos_x: pos_x ?? null,
        pos_y: pos_y ?? null,
        color: color ?? null,
      },
    });

    return res.status(201).json(note);
  } catch (err) {
    console.error("createNote error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const updateNote = async (req, res) => {
  try {
    const noteId = Number(req.params.noteId);
    if (!noteId) return res.status(400).json({ message: "Invalid id" });

    const existing = await prisma.moodboard_notes.findUnique({ where: { id: noteId } });
    if (!existing) return res.status(404).json({ message: "Note not found" });

    const { error } = await ensureMoodboardAccess(existing.moodboard_id, req.user, true);
    if (error) return res.status(error.status).json({ message: error.message });

    const { kind, title, content, parent_id, pos_x, pos_y, color } = req.body;

    const updated = await prisma.moodboard_notes.update({
      where: { id: noteId },
      data: {
        ...(kind !== undefined && { kind }),
        ...(title !== undefined && { title }),
        ...(content !== undefined && { content }),
        ...(parent_id !== undefined && { parent_id }),
        ...(pos_x !== undefined && { pos_x }),
        ...(pos_y !== undefined && { pos_y }),
        ...(color !== undefined && { color }),
      },
    });

    return res.json(updated);
  } catch (err) {
    console.error("updateNote error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const deleteNote = async (req, res) => {
  try {
    const noteId = Number(req.params.noteId);
    if (!noteId) return res.status(400).json({ message: "Invalid id" });

    const existing = await prisma.moodboard_notes.findUnique({ where: { id: noteId } });
    if (!existing) return res.status(404).json({ message: "Note not found" });

    const { error } = await ensureMoodboardAccess(existing.moodboard_id, req.user, true);
    if (error) return res.status(error.status).json({ message: error.message });

    await prisma.moodboard_notes.delete({ where: { id: noteId } });

    return res.json({ message: "Note deleted" });
  } catch (err) {
    console.error("deleteNote error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// --------- Timeline events ---------

export const getTimeline = async (req, res) => {
  try {
    const moodboardId = Number(req.params.id);
    if (!moodboardId) return res.status(400).json({ message: "Invalid id" });

    const { error } = await ensureMoodboardAccess(moodboardId, req.user, false);
    if (error) return res.status(error.status).json({ message: error.message });

    const events = await prisma.moodboard_timeline_events.findMany({
      where: { moodboard_id: moodboardId },
      orderBy: { position: "asc" },
    });

    return res.json(events);
  } catch (err) {
    console.error("getTimeline error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const createTimelineEvent = async (req, res) => {
  try {
    const moodboardId = Number(req.params.id);
    if (!moodboardId) return res.status(400).json({ message: "Invalid id" });

    const { error } = await ensureMoodboardAccess(moodboardId, req.user, true);
    if (error) return res.status(error.status).json({ message: error.message });

    const { label, description, act, position } = req.body;

    if (!label) return res.status(400).json({ message: "label is required" });

    const event = await prisma.moodboard_timeline_events.create({
      data: {
        moodboard_id: moodboardId,
        label,
        description: description ?? null,
        act: act ?? null,
        position: position ?? 0,
      },
    });

    return res.status(201).json(event);
  } catch (err) {
    console.error("createTimelineEvent error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const updateTimelineEvent = async (req, res) => {
  try {
    const eventId = Number(req.params.eventId);
    if (!eventId) return res.status(400).json({ message: "Invalid id" });

    const existing = await prisma.moodboard_timeline_events.findUnique({ where: { id: eventId } });
    if (!existing) return res.status(404).json({ message: "Event not found" });

    const { error } = await ensureMoodboardAccess(existing.moodboard_id, req.user, true);
    if (error) return res.status(error.status).json({ message: error.message });

    const { label, description, act, position } = req.body;

    const updated = await prisma.moodboard_timeline_events.update({
      where: { id: eventId },
      data: {
        ...(label !== undefined && { label }),
        ...(description !== undefined && { description }),
        ...(act !== undefined && { act }),
        ...(position !== undefined && { position }),
      },
    });

    return res.json(updated);
  } catch (err) {
    console.error("updateTimelineEvent error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const deleteTimelineEvent = async (req, res) => {
  try {
    const eventId = Number(req.params.eventId);
    if (!eventId) return res.status(400).json({ message: "Invalid id" });

    const existing = await prisma.moodboard_timeline_events.findUnique({ where: { id: eventId } });
    if (!existing) return res.status(404).json({ message: "Event not found" });

    const { error } = await ensureMoodboardAccess(existing.moodboard_id, req.user, true);
    if (error) return res.status(error.status).json({ message: error.message });

    await prisma.moodboard_timeline_events.delete({ where: { id: eventId } });

    return res.json({ message: "Event deleted" });
  } catch (err) {
    console.error("deleteTimelineEvent error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

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

export const getQuotes = async (req, res) => {
  try {
    const moodboardId = Number(req.params.id);
    if (!moodboardId) return res.status(400).json({ message: "Invalid id" });

    const { error } = await ensureMoodboardAccess(moodboardId, req.user, false);
    if (error) return res.status(error.status).json({ message: error.message });

    const quotes = await prisma.moodboard_quotes.findMany({
      where: { moodboard_id: moodboardId },
      orderBy: { id: "asc" },
    });

    return res.json(quotes);
  } catch (err) {
    console.error("getQuotes error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const createQuote = async (req, res) => {
  try {
    const moodboardId = Number(req.params.id);
    if (!moodboardId) return res.status(400).json({ message: "Invalid id" });

    const { error } = await ensureMoodboardAccess(moodboardId, req.user, true);
    if (error) return res.status(error.status).json({ message: error.message });

    const { kind, text, speaker, tone } = req.body;

    if (!text) return res.status(400).json({ message: "text is required" });

    const quote = await prisma.moodboard_quotes.create({
      data: {
        moodboard_id: moodboardId,
        kind: kind ?? null,
        text,
        speaker: speaker ?? null,
        tone: tone ?? null,
      },
    });

    return res.status(201).json(quote);
  } catch (err) {
    console.error("createQuote error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const updateQuote = async (req, res) => {
  try {
    const quoteId = Number(req.params.quoteId);
    if (!quoteId) return res.status(400).json({ message: "Invalid id" });

    const existing = await prisma.moodboard_quotes.findUnique({ where: { id: quoteId } });
    if (!existing) return res.status(404).json({ message: "Quote not found" });

    const { error } = await ensureMoodboardAccess(existing.moodboard_id, req.user, true);
    if (error) return res.status(error.status).json({ message: error.message });

    const { kind, text, speaker, tone } = req.body;

    const updated = await prisma.moodboard_quotes.update({
      where: { id: quoteId },
      data: {
        ...(kind !== undefined && { kind }),
        ...(text !== undefined && { text }),
        ...(speaker !== undefined && { speaker }),
        ...(tone !== undefined && { tone }),
      },
    });

    return res.json(updated);
  } catch (err) {
    console.error("updateQuote error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const deleteQuote = async (req, res) => {
  try {
    const quoteId = Number(req.params.quoteId);
    if (!quoteId) return res.status(400).json({ message: "Invalid id" });

    const existing = await prisma.moodboard_quotes.findUnique({ where: { id: quoteId } });
    if (!existing) return res.status(404).json({ message: "Quote not found" });

    const { error } = await ensureMoodboardAccess(existing.moodboard_id, req.user, true);
    if (error) return res.status(error.status).json({ message: error.message });

    await prisma.moodboard_quotes.delete({ where: { id: quoteId } });

    return res.json({ message: "Quote deleted" });
  } catch (err) {
    console.error("deleteQuote error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

import prisma from "../utils/prisma.js";

export const moodboardOwnerOnly = async (req, res, next) => {
  try {
    const moodboardId = Number(req.params.id);
    if (!moodboardId) return res.status(400).json({ message: "Invalid id" });

    const moodboard = await prisma.moodboards.findUnique({ where: { moodboard_id: moodboardId } });

    if (!moodboard || moodboard.is_deleted) {
      return res.status(404).json({ message: "Moodboard not found" });
    }

    if (moodboard.owner_id !== req.user?.user_id) {
      return res.status(403).json({ message: "Not allowed" });
    }

    next();
  } catch (err) {
    console.error("moodboardOwnerOnly error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

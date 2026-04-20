import prisma from "../utils/prisma.js";

export const followWriter = async (req, res) => {
  try {
    const follower = req.user;
    const writerId = Number(req.params.writerId);

    if (!writerId) return res.status(400).json({ message: "Invalid writerId" });

    if (writerId === follower.user_id) {
      return res.status(400).json({ message: "Cannot follow yourself" });
    }

    const writer = await prisma.users.findUnique({
      where: { user_id: writerId },
      include: { profile: { select: { role: true } } },
    });
    if (!writer) return res.status(404).json({ message: "Writer not found" });

    const isFollowableWriter = Boolean(writer.is_writer) || writer.profile?.role === "writer";
    if (!isFollowableWriter) {
      return res.status(400).json({ message: "Target user is not a followable writer" });
    }

    const existing = await prisma.writer_follows.findFirst({
      where: { follower_id: follower.user_id, writer_id: writerId },
    });

    if (existing) {
      return res.json({ following: true });
    }

    await prisma.writer_follows.create({
      data: { follower_id: follower.user_id, writer_id: writerId },
    });

    await prisma.notifications.create({
      data: {
        recipient_id: writerId,
        actor_id: follower.user_id,
        type: "new_follower",
        entity_type: "user",
        entity_id: follower.user_id,
        data: null,
      },
    });

    return res.status(201).json({ following: true });
  } catch (err) {
    console.error("followWriter error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const unfollowWriter = async (req, res) => {
  try {
    const follower = req.user;
    const writerId = Number(req.params.writerId);

    if (!writerId) return res.status(400).json({ message: "Invalid writerId" });

    await prisma.writer_follows.deleteMany({
      where: { follower_id: follower.user_id, writer_id: writerId },
    });

    return res.json({ following: false });
  } catch (err) {
    console.error("unfollowWriter error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getMyFollowingWriters = async (req, res) => {
  try {
    const user = req.user;
    const items = await prisma.writer_follows.findMany({
      where: { follower_id: user.user_id },
      orderBy: { created_at: "desc" },
      include: {
        writer: {
          select: {
            user_id: true,
            first_name: true,
            last_name: true,
            profile: { select: { handle_name: true, profile_image: true } },
          },
        },
      },
    });

    return res.json({ following: items });
  } catch (err) {
    console.error("getMyFollowingWriters error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getWriterFollowers = async (req, res) => {
  try {
    const writerId = Number(req.params.writerId);
    if (!writerId) return res.status(400).json({ message: "Invalid writerId" });

    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 30));
    const skip = Math.max(0, Number(req.query.skip) || 0);

    const writer = await prisma.users.findUnique({
      where: { user_id: writerId },
      include: { profile: { select: { role: true } } },
    });
    if (!writer) return res.status(404).json({ message: "Writer not found" });

    const isFollowableWriter = Boolean(writer.is_writer) || writer.profile?.role === "writer";
    if (!isFollowableWriter) {
      return res.status(400).json({ message: "Target user is not a followable writer" });
    }

    const [total, rows] = await Promise.all([
      prisma.writer_follows.count({ where: { writer_id: writerId } }),
      prisma.writer_follows.findMany({
        where: { writer_id: writerId },
        orderBy: { created_at: "desc" },
        skip,
        take: limit,
        include: {
          follower: {
            select: {
              user_id: true,
              first_name: true,
              last_name: true,
              profile: { select: { handle_name: true, profile_image: true } },
            },
          },
        },
      }),
    ]);

    return res.json({ total, skip, limit, followers: rows });
  } catch (err) {
    console.error("getWriterFollowers error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

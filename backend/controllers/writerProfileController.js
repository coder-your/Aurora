import prisma from "../utils/prisma.js";

export const getWriterPublicProfile = async (req, res) => {
  try {
    const writerId = Number(req.params.writerId);
    if (!writerId) return res.status(400).json({ message: "Invalid writerId" });

    const rawWriter = await prisma.users.findUnique({
      where: { user_id: writerId },
      select: {
        user_id: true,
        first_name: true,
        last_name: true,
        is_writer: true,
        profile: {
          select: {
            first_name: true,
            last_name: true,
            handle_name: true,
            profile_image: true,
            bio: true,
            role: true,
          },
        },
      },
    });

    const isWriter = Boolean(rawWriter?.is_writer) || rawWriter?.profile?.role === "writer";
    if (!rawWriter || !isWriter) {
      return res.status(404).json({ message: "Writer not found" });
    }

    // Prefer profile names over user table names (profile is where users update their display name)
    const writer = {
      user_id: rawWriter.user_id,
      first_name: rawWriter.profile?.first_name || rawWriter.first_name,
      last_name: rawWriter.profile?.last_name || rawWriter.last_name,
      is_writer: rawWriter.is_writer,
      profile: rawWriter.profile,
    };

    const [followersCount, books] = await Promise.all([
      prisma.writer_follows.count({ where: { writer_id: writerId } }),
      prisma.stories.findMany({
        where: {
          author_id: writerId,
          status: "published",
          visibility: "public",
          is_deleted: false,
        },
        orderBy: { last_updated: "desc" },
        select: {
          story_id: true,
          title: true,
          description: true,
          cover_url: true,
          category: true,
          tags: true,
          total_chapters: true,
          total_words: true,
          estimated_minutes: true,
          last_updated: true,
        },
      }),
    ]);

    return res.json({ writer, followersCount, books });
  } catch (err) {
    console.error("getWriterPublicProfile error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

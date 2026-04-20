// // import prisma from "../utils/prisma.js";

// // export const getWriterDashboard = async (req, res) => {
// //   try {
// //     const user = req.user;
// //     const books = await prisma.stories.findMany({ where: { author_id: user.user_id, is_deleted: false }});
// //     const drafts = books.filter(b => b.visibility === "draft");
// //     const published = books.filter(b => b.status === "published");
// //     const total_word_count = books.reduce((s,b)=>s + (b.total_words||0),0);
// //     const recent = await prisma.stories.findMany({ where: { author_id: user.user_id }, orderBy: { last_updated: "desc" }, take: 5 });

// //     return res.json({
// //       total_books: books.length,
// //       drafts_count: drafts.length,
// //       published_count: published.length,
// //       total_word_count,
// //       recent
// //     });
// //   } catch (err) {
// //     console.error(err);
// //     return res.status(500).json({ message: err.message });
// //   }
// // };


import prisma from "../utils/prisma.js";

export const getWriterDashboard = async (req, res) => {
  try {
    const user = req.user;

    const books = await prisma.stories.findMany({
      where: { author_id: user.user_id, is_deleted: false },
      select: {
        story_id: true,
        title: true,
        description: true,
        category: true,
        tags: true,
        status: true,
        visibility: true,
        total_words: true,
        last_updated: true,
        cover_url: true,
        created_at: true,
      }
    });

    // FIXED — use STATUS not VISIBILITY
    const drafts = books.filter(b => b.status === "draft");
    const in_progress = books.filter(b => b.status === "in_progress");
    const published = books.filter(b => b.status === "published");

    const total_word_count = books.reduce((sum, b) => sum + (b.total_words || 0), 0);

    const recent = await prisma.stories.findMany({
      where: { author_id: user.user_id, is_deleted: false },
      orderBy: { last_updated: "desc" },
      take: 5,
      select: {
        story_id: true,
        title: true,
        status: true,
        cover_url: true,
        last_updated: true
      }
    });

    return res.json({
      total_books: books.length,
      drafts_count: drafts.length,
      in_progress_count: in_progress.length,
      published_count: published.length,
      total_word_count,
      recent,
      drafts,
      in_progress,
      published,
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: err.message });
  }
};


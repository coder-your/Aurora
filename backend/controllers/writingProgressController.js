import prisma from "../utils/prisma.js";

const startOfDay = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

// Relational model: one log row per user+story+date
// Streak logic (simple): count consecutive days with at least 1 log across any story.
// Response returns updated streak length.
export const upsertWritingProgress = async (req, res) => {
  try {
    const user = req.user;

    const storyId = Number(req.body.story_id);
    const wordCount = Number(req.body.wordCount);
    const timeSpentMinutes = Number(req.body.timeSpentMinutes);
    const moodNotes = req.body.moodNotes ?? null;

    if (!storyId) return res.status(400).json({ message: "story_id is required" });
    if (!Number.isFinite(wordCount) || wordCount < 0) {
      return res.status(400).json({ message: "wordCount must be a non-negative number" });
    }
    if (!Number.isFinite(timeSpentMinutes) || timeSpentMinutes < 0) {
      return res.status(400).json({ message: "timeSpentMinutes must be a non-negative number" });
    }

    const today = startOfDay(new Date());

    // Ensure the story belongs to this writer
    const story = await prisma.stories.findUnique({
      where: { story_id: storyId },
      select: { story_id: true, author_id: true },
    });

    if (!story || story.author_id !== user.user_id) {
      return res.status(403).json({ message: "Invalid manuscript" });
    }

    // Upsert by (user_id, story_id, date)
    await prisma.writing_progress_logs.upsert({
      where: {
        user_id_story_id_date: {
          user_id: user.user_id,
          story_id: storyId,
          date: today,
        },
      },
      update: {
        word_count: wordCount,
        time_spent_minutes: timeSpentMinutes,
        mood_notes: moodNotes,
      },
      create: {
        user_id: user.user_id,
        story_id: storyId,
        date: today,
        word_count: wordCount,
        time_spent_minutes: timeSpentMinutes,
        mood_notes: moodNotes,
      },
    });

    const streak = await computeStreakForUser(user.user_id);

    return res.json({
      message: "Progress saved",
      streak,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: err.message || "Internal server error" });
  }
};

export const getWritingStreak = async (req, res) => {
  try {
    const user = req.user;
    const streak = await computeStreakForUser(user.user_id);
    return res.json({ streak });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: err.message || "Internal server error" });
  }
};

async function computeStreakForUser(userId) {
  // Consecutive days (including today) where at least one log exists.
  // Find unique days with logs.
  const today = startOfDay(new Date());
  const daysWithLogs = await prisma.writing_progress_logs.findMany({
    where: { user_id: userId },
    select: { date: true },
    orderBy: { date: "desc" },
    take: 365,
  });

  const dateSet = new Set(daysWithLogs.map((d) => startOfDay(d.date).getTime()));

  let streak = 0;
  // start from today, walk backwards
  for (let i = 0; i < 365; i++) {
    const day = new Date(today);
    day.setDate(today.getDate() - i);
    const t = startOfDay(day).getTime();
    if (dateSet.has(t)) streak += 1;
    else break;
  }

  return { days: streak };
}


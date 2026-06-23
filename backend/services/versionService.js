import prisma from "../utils/prisma.js";
import { AUTOSAVE } from "../constants.js";
import { makeSignature } from "../utils/hmac.js";
import { calculateMetrics } from "../utils/textMetrics.js";

export async function createChapterVersionIfNeeded({ chapterId, author, newRaw, newHtml, newDelta, force=false }) {
  // always save autosave request (we'll store last autosave to DB by updating chapter updated_at & content)
  // But snapshot creation obeys threshold/time rules
  const chapter = await prisma.chapters.findUnique({ where: { chapter_id: chapterId }});
  if (!chapter) throw new Error("Chapter not found");

  const lastVersion = await prisma.chapter_versions.findFirst({
    where: { chapter_id: chapterId },
    orderBy: { created_at: "desc" }
  });

  const metrics = calculateMetrics(newRaw);
  const changedChars = lastVersion ? Math.abs(metrics.char_count - lastVersion.char_count) : metrics.char_count;
  const changeRatio = lastVersion ? (changedChars / Math.max(1, lastVersion.char_count)) : 1;
  const minutesSinceLast = lastVersion ? ((Date.now() - new Date(lastVersion.created_at).getTime())/60000) : Infinity;

  const shouldSnapshot = force ||
    minutesSinceLast >= AUTOSAVE.MINUTES ||
    changeRatio >= AUTOSAVE.CHANGE_THRESHOLD;

  if (shouldSnapshot) {
    const authorName = `${author.first_name || ""} ${author.last_name || ""}`.trim() || author.email;
    const sig = makeSignature(authorName, newRaw);
    await prisma.chapter_versions.create({
      data: {
        chapter_id: chapterId,
        author_id: author.user_id,
        content_raw: newRaw,
        content_html: newHtml,
        content_delta: newDelta ? JSON.stringify(newDelta) : null,
        word_count: metrics.word_count,
        char_count: metrics.char_count,
        paragraphs: metrics.paragraphs,
        reading_minutes: metrics.reading_minutes,
        signature: sig
      }
    });

    // prune old versions
    const versions = await prisma.chapter_versions.findMany({
      where: { chapter_id: chapterId },
      orderBy: { created_at: "desc" }
    });
    if (versions.length > AUTOSAVE.KEEP_VERSIONS) {
      const toDelete = versions.slice(AUTOSAVE.KEEP_VERSIONS);
      await prisma.chapter_versions.deleteMany({ where: { version_id: { in: toDelete.map(v=>v.version_id) } }});
    }
  }
}

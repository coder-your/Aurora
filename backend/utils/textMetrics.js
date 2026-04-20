export function calculateMetrics(text = "") {
  const t = String(text || "");
  const char_count = t.length;
  const words = t.trim().length ? t.trim().split(/\s+/) : [];
  const word_count = words.length;
  const paragraphs = (t.split(/\n+/).filter(s=>s.trim()).length) || 0;
  // reading speed 200 wpm
  const reading_minutes = Math.max(1, Math.ceil(word_count / 200));
  return { word_count, char_count, paragraphs, reading_minutes };
}

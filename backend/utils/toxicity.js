let modelPromise = null;

const threshold = (() => {
  const raw = process.env.TOXICITY_THRESHOLD;
  const n = raw !== undefined ? Number(raw) : NaN;
  if (!Number.isFinite(n)) return 0.9;
  return Math.min(0.99, Math.max(0.5, n));
})();

const profanityPatterns = [
  /\bfuck\b/i,
  /\bfucking\b/i,
  /\bfucker\b/i,
  /\bshit\b/i,
  /\bbitch\b/i,
  /\basshole\b/i,
  /\bcunt\b/i,
  /\bdick\b/i,
  /\bpussy\b/i,
  /\bmotherfucker\b/i,
];

const detectProfanity = (text) => {
  const body = (text || "").toString();
  if (!body.trim()) return { hit: false, labels: [] };
  const hit = profanityPatterns.some((re) => re.test(body));
  return hit ? { hit: true, labels: ["profanity"] } : { hit: false, labels: [] };
};

const loadModel = async () => {
  if (modelPromise) return modelPromise;

  modelPromise = (async () => {
    try {
      await import("@tensorflow/tfjs");
    } catch {
    }

    const mod = await import("@tensorflow-models/toxicity");
    const load = mod.load || mod.default?.load;
    if (typeof load !== "function") {
      throw new Error("toxicity model loader not found");
    }

    return load(threshold);
  })();

  return modelPromise;
};

export const analyzeToxicity = async (text) => {
  try {
    const body = (text || "").toString();
    if (!body.trim()) return { ok: true, isToxic: false, labels: [] };

    const prof = detectProfanity(body);
    if (prof.hit) {
      return { ok: true, isToxic: true, labels: prof.labels };
    }

    const model = await loadModel();
    const predictions = await model.classify([body]);

    const toxicLabels = (predictions || [])
      .filter((p) => p && p.results && p.results[0] && p.results[0].match)
      .map((p) => p.label);

    return { ok: true, isToxic: toxicLabels.length > 0, labels: toxicLabels };
  } catch (err) {
    const prof = detectProfanity(text);
    if (prof.hit) {
      return { ok: false, isToxic: true, labels: prof.labels, error: err.message };
    }
    return { ok: false, isToxic: false, labels: [], error: err.message };
  }
};

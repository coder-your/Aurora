// import NodeCache from "node-cache";
// import axios from "axios";

// const cache = new NodeCache({
//   stdTTL: Number(process.env.DICTIONARY_TTL || 3600) // cache 1 hour default
// });

// // Tiny local fallback dictionary for common English words
// const localDictionary = {
//   hello: "[interjection] Used as a greeting or to begin a phone conversation.",
//   world: "[noun] The earth, together with all of its countries and peoples.",
//   book: "[noun] A written or printed work consisting of pages glued or sewn together.",
//   story: "[noun] An account of imaginary or real people and events told for entertainment.",
//   chapter: "[noun] A main division of a book, typically with a number or title.",
//   author: "[noun] A writer of a book, article, or document.",
//   read: "[verb] Look at and comprehend the meaning of written or printed matter.",
//   write: "[verb] Mark letters or words on a surface; compose text.",
//   love: "[noun] An intense feeling of deep affection.",
//   life: "[noun] The condition that distinguishes animals and plants from inorganic matter.",
//   time: "[noun] The indefinite continued progress of existence and events.",
//   day: "[noun] A period of 24 hours.",
//   night: "[noun] The period of darkness in each 24-hour period.",
//   friend: "[noun] A person whom one knows and has a bond of mutual affection.",
//   water: "[noun] A colorless, transparent, odorless liquid that forms the basis of living organisms.",
//   food: "[noun] Any nutritious substance that people or animals eat or drink.",
//   home: "[noun] The place where one lives permanently.",
//   family: "[noun] A group of related people.",
//   work: "[verb] Be engaged in physical or mental activity to achieve a result.",
//   school: "[noun] An institution for educating children.",
//   learn: "[verb] Gain or acquire knowledge of or skill in something by study or experience.",
//   help: "[verb] Make it easier for someone to do something by offering one's services.",
//   happy: "[adjective] Feeling or showing pleasure or contentment.",
//   sad: "[adjective] Feeling or showing sorrow; unhappy.",
//   good: "[adjective] To be desired or approved of.",
//   bad: "[adjective] Of poor quality; not good.",
//   big: "[adjective] Of considerable size or extent.",
//   small: "[adjective] Of a size that is less than normal or average.",
//   new: "[adjective] Produced, introduced, or discovered recently or for the first time.",
//   old: "[adjective] Having lived for a long time; no longer young.",
// };

// // GET /api/dictionary/:word
// export const lookupWord = async (req, res) => {
//   try {
//     const { word } = req.params;

//     // Validate input
//     if (!word || !/^[a-zA-Z'-]+$/.test(word)) {
//       return res.status(400).json({ message: "Invalid word" });
//     }

//     const key = `dict:${word.toLowerCase()}`;
//     const cached = cache.get(key);
//     if (cached) return res.json(cached);

   
//     const url = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`;

//     let meaning = "No definition found";
//     let result = null;

//     try {
//       const resp = await axios.get(url, { timeout: 5000 });

//       if (Array.isArray(resp.data) && resp.data.length > 0) {
//         const entry = resp.data[0];

//         if (entry.meanings && entry.meanings.length > 0) {
//           // Get the first meaning
//           const firstMeaning = entry.meanings[0];
//           const partOfSpeech = firstMeaning.partOfSpeech || "";
//           const defs = firstMeaning.definitions || [];

//           if (defs && defs.length > 0) {
//             const firstDef = defs[0];
//             meaning = firstDef.definition || "No definition found";
            
//             // Add example if available
//             if (firstDef.example) {
//               meaning += ` (e.g., "${firstDef.example}")`;
//             }
            
//             // Add part of speech prefix if available
//             if (partOfSpeech) {
//               meaning = `[${partOfSpeech}] ${meaning}`;
//             }
//           }
//         }
//       }

//       result = { word, meaning: meaning || "No definition found" };
//       cache.set(key, result);

//       return res.json(result);

//     } catch (apiError) {
//       console.error("Dictionary API error:", apiError.response?.status, apiError.message);
      
//       // Check if word not found (404)
//       if (apiError.response?.status === 404) {
//         const notFound = {
//           word,
//           meaning: "Word not found in dictionary."
//         };
//         cache.set(key, notFound);
//         return res.json(notFound);
//       }

//       // Other API errors - graceful fallback
//       const fallback = {
//         word,
//         meaning: "Definition temporarily unavailable. Please try again later."
//       };

//       // Don't cache errors
//       return res.json(fallback);
//     }

//   } catch (err) {
//     console.error("Dictionary server error:", err);
//     return res.status(500).json({ message: "Dictionary error" });
//   }
// };


import NodeCache from "node-cache";
import axios from "axios";

const cache = new NodeCache({
  stdTTL: Number(process.env.DICTIONARY_TTL || 3600) // cache 1 hour default
});

// GET /api/dictionary/:word
export const lookupWord = async (req, res) => {
  try {
    const { word } = req.params;
    const API_KEY = "bef48755-4a9f-40d1-b6a0-f5e63103b5e2"; //  MW Key

    // Validate input
    if (!word || !/^[a-zA-Z'-]+$/.test(word)) {
      return res.status(400).json({ message: "Invalid word" });
    }

    const key = `dict:${word.toLowerCase()}`;
    const cached = cache.get(key);
    if (cached) return res.json(cached);

    // Merriam-Webster URL
    const url = `https://www.dictionaryapi.com/api/v3/references/collegiate/json/${encodeURIComponent(word.toLowerCase())}?key=${API_KEY}`;

    try {
      const resp = await axios.get(url, { timeout: 5000 });

      // MW returns an array of strings (suggestions) if the word isn't found
      if (!resp.data.length || typeof resp.data[0] === 'string') {
        const notFound = { word, meaning: "Word not found. Did you mean: " + (resp.data.slice(0, 3).join(", ") || "nothing similar") };
        cache.set(key, notFound);
        return res.json(notFound);
      }

      const entry = resp.data[0];
      const partOfSpeech = entry.fl || ""; // MW uses 'fl' for functional label
      const definitions = entry.shortdef || [];
      
      let meaning = definitions.length > 0 ? definitions[0] : "No definition found";

      // Formatting logic
      if (partOfSpeech && definitions.length > 0) {
        meaning = `[${partOfSpeech}] ${meaning}`;
      }

      const result = { word, meaning };
      cache.set(key, result);
      return res.json(result);

    } catch (apiError) {
      console.error("MW API error:", apiError.response?.status, apiError.message);
      return res.json({ word, meaning: "Definition temporarily unavailable." });
    }

  } catch (err) {
    console.error("Server error:", err);
    return res.status(500).json({ message: "Dictionary error" });
  }
};
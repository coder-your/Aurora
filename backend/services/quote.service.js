import axios from "axios";

// Fallback quotes in case external API fails
const fallbackQuotes = [
  { content: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
  { content: "In the middle of difficulty lies opportunity.", author: "Albert Einstein" },
  { content: "A reader lives a thousand lives before he dies.", author: "George R.R. Martin" },
  { content: "There is no friend as loyal as a book.", author: "Ernest Hemingway" },
  { content: "The more that you read, the more things you will know.", author: "Dr. Seuss" },
  { content: "A word after a word after a word is power.", author: "Margaret Atwood" },
  { content: "Start writing, no matter what. The water does not flow until the faucet is turned on.", author: "Louis L'Amour" },
  { content: "You can always edit a bad page. You can't edit a blank page.", author: "Jodi Picoult" },
  { content: "Writing is an exploration. You start from nothing and learn as you go.", author: "E.L. Doctorow" },
  { content: "If you want to be a writer, you must do two things above all others: read a lot and write a lot.", author: "Stephen King" },
];

// In-memory cache for daily quote
let cachedQuote = null;
let cacheDate = null;

/**
 * Get today's date string for cache comparison
 */
const getTodayString = () => {
  const now = new Date();
  return `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
};

/**
 * Check if cache is still valid (same day)
 */
const isCacheValid = () => {
  return cachedQuote && cacheDate === getTodayString();
};

/**
 * Fetch quote from external API
 */
const fetchFromAPI = async () => {
  // Try Quotable API first 
  try {
    const response = await axios.get("https://api.quotable.io/random", { timeout: 8000 });
    if (response.data) {
      return { content: response.data.content, author: response.data.author };
    }
  } catch (err) {
    console.warn("Quotable API failed:", err.message);
  }

  // Try Forismatic API as backup 
  try {
    // Some environments experience intermittent timeouts; try once, then a quick retry.
    const forismaticUrl = "https://api.forismatic.com/api/1.0/?method=getQuote&format=json&lang=en";
    let response = null;
    try {
      response = await axios.get(forismaticUrl, { timeout: 7000 });
    } catch (firstErr) {
      console.warn("Forismatic first attempt failed:", firstErr.message);
      // retry once quickly
      response = await axios.get(forismaticUrl, { timeout: 5000 }).catch((e) => {
        console.warn("Forismatic retry failed:", e.message);
        return null;
      });
    }

    if (response && response.data && response.data.quoteText) {
      return { content: response.data.quoteText, author: response.data.quoteAuthor || "Unknown" };
    }
  } catch (err) {
    console.warn("Forismatic API failed:", err.message);
  }

  return null;
};

/**
 * Get random fallback quote
 */
const getRandomFallback = () => {
  const idx = Math.floor(Math.random() * fallbackQuotes.length);
  return fallbackQuotes[idx];
};

/**
 * Get quote of the day with caching
 * - Caches quote for the entire day to reduce API calls
 * - Falls back to local quotes if API fails
 */
export const getRandomQuote = async () => {
  // Return cached quote if valid
  if (isCacheValid()) {
    return cachedQuote;
  }

  // Try to fetch from API
  const apiQuote = await fetchFromAPI();
  
  if (apiQuote) {
    // Cache the new quote
    cachedQuote = apiQuote;
    cacheDate = getTodayString();
    return apiQuote;
  }

  // Fallback to local quotes
  const fallback = getRandomFallback();
  cachedQuote = fallback;
  cacheDate = getTodayString();
  return fallback;
};

/**
 * Force refresh - always fetch a new quote from external API
 * Falls back to random local quote if API fails
 */
export const refreshQuote = async () => {
  // Always try external API first
  const apiQuote = await fetchFromAPI();
  
  if (apiQuote) {
    return apiQuote;
  }
  
  // Fallback to random local quote (different each time)
  return getRandomFallback();
};

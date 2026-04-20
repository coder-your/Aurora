import * as quoteService from "../services/quote.service.js";

export const fetchQuote = async (req, res) => {
  try {
    const quote = await quoteService.getRandomQuote();
    res.json(quote);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch quote" });
  }
};

export const refreshQuote = async (req, res) => {
  try {
    const quote = await quoteService.refreshQuote();
    res.json(quote);
  } catch (err) {
    res.status(500).json({ error: "Failed to refresh quote" });
  }
};

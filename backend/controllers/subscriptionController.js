import { sendSubscriptionEmail } from "../utils/email.js";

export const subscribeUpdates = async (req, res) => {
  try {
    const { email } = req.body || {};

    if (!email || typeof email !== "string") {
      return res.status(400).json({ message: "A valid email is required" });
    }

    await sendSubscriptionEmail(email.trim());

    return res.json({ message: "Subscribed successfully" });
  } catch (err) {
    console.error("subscribeUpdates error:", err);
    return res.status(500).json({ message: "Failed to subscribe" });
  }
};

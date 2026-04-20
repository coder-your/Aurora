import crypto from "crypto";
const HMAC_SECRET = process.env.HMAC_SECRET || "hmac_default_secret";

export function makeSignature(authorName, content) {
  const h = crypto.createHmac("sha256", HMAC_SECRET);
  h.update(`${authorName}:${content}`);
  return h.digest("hex");
}

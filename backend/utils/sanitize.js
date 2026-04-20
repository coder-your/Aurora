import sanitizeHtml from "sanitize-html";
import xss from "xss";

export function sanitizeInput(str) {
  if (!str) return str;
  // strip dangerous tags/attributes but allow basic formatting
  const clean = sanitizeHtml(str, {
    allowedTags: [
      "b","i","em","strong","a","p","ul","ol","li","br","h1","h2","h3","h4","blockquote","code","pre","img"
    ],
    allowedAttributes: {
      a: ["href","rel","target"],
      img: ["src","alt"]
    },
    allowedSchemes: ["http","https","mailto","data"]
  });
  return xss(clean);
}

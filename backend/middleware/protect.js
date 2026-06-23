import jwt from "jsonwebtoken";
import { pool } from "../config/db.js";
import prisma from "../utils/prisma.js";

const isLikelyDbError = (err) => {
  const msg = (err && err.message ? err.message : "").toLowerCase();
  const code = err && err.code ? String(err.code) : "";
  if (code.startsWith("08")) return true; // pg connection errors
  if (msg.includes("connect")) return true;
  if (msg.includes("timeout")) return true;
  if (msg.includes("does not exist") || msg.includes("relation") || msg.includes("table")) return true;
  if (msg.includes("ssl")) return true;
  return false;
};

export const protect = async (req, res, next) => {
  try {
    // Read token from cookie OR Authorization header
    let token = req.cookies?.token;

    if (!token && req.headers.authorization?.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) return res.status(401).json({ message: "Not authorized" });

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ message: "JWT_SECRET not configured" });
    }

    // Verify token
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    // Fetch full user from DB
    const userId = payload?.id ?? payload?.user_id;
    if (!userId) return res.status(401).json({ message: "Not authorized" });

    const result = await pool.query(
      "SELECT * FROM users WHERE user_id = $1 LIMIT 1",
      [Number(userId)]
    );

    let user = result.rows[0];

    // Fallback: some parts of the app use Prisma. If pool points at a different DB
    // or the user row isn't visible here, avoid a false logout.
    if (!user) {
      try {
        const prismaUser = await prisma.users.findUnique({
          where: { user_id: Number(userId) },
        });
        if (prismaUser) user = prismaUser;
      } catch (e) {
        // If Prisma also fails, keep original behavior below.
        void e;
      }
    }

    if (!user) return res.status(401).json({ message: "User not found" });

    req.user = user; // attach DB user to request
    next();
  } catch (err) {
    if (isLikelyDbError(err)) {
      return res.status(500).json({ message: "Internal server error", error: err.message });
    }
    return res.status(401).json({ message: "Not authorized", error: err.message });
  }
};

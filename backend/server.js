import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import path from "path";
import { fileURLToPath } from "url";

// Route imports
import routes from "./routes/index.js";
import authRoutes from "./routes/authRoutes.js";
import profileRoutes from "./routes/profileRoutes.js";
import recommendationRoutes from "./routes/recommendation.routes.js";
import readingRoutes from "./routes/reading.routes.js";
import libraryRoutes from "./routes/library.routes.js";
import moodboardRoutes from "./routes/moodboard.routes.js";
import auroraCardsRoutes from "./routes/auroraCards.routes.js";
dotenv.config();

const app = express();

/* ----------------------------------------------------
   CORS (single correct usage)
----------------------------------------------------- */
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
// DO NOT set COOP by default - it breaks OAuth popups.
// Cross-Origin-Opener-Policy: same-origin blocks window.closed() checks
// which are essential for popup-based OAuth flows (Google Sign-In, etc).
// ONLY enable COOP if explicitly requested and really needed.
const enableCoop = process.env.ENABLE_COOP === "true";
if (enableCoop) {
  // Only if explicitly enabled via env var
  app.use((req, res, next) => {
    res.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
    res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
    next();
  });
}

/* ----------------------------------------------------
   Security Middleware (default: allow OAuth popups)
----------------------------------------------------- */
app.use(helmet({
  crossOriginOpenerPolicy: false,
  crossOriginEmbedderPolicy: false,
}));

/* ----------------------------------------------------
   Body Parsers
----------------------------------------------------- */
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true }));

/* ----------------------------------------------------
   Cookie Parser
----------------------------------------------------- */
app.use(cookieParser());

/* ----------------------------------------------------
   Static Uploads (Local)
----------------------------------------------------- */
const __dirname = path.dirname(fileURLToPath(import.meta.url));
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

/* ----------------------------------------------------
   Test Endpoints
----------------------------------------------------- */
app.get("/", (req, res) => res.send("Aurora API running"));
app.get("/api/test", (req, res) => {
  res.json({ message: "Frontend connected successfully" });
});

/* ----------------------------------------------------
   Main API Router (Optional index.js router)
----------------------------------------------------- */
app.use("/api", routes);

/* ----------------------------------------------------
   Direct Routes
----------------------------------------------------- */
app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/recommendations", recommendationRoutes);
app.use("/api/reading", readingRoutes);
app.use("/api/library", libraryRoutes);
app.use("/api/moodboards", moodboardRoutes);
app.use("/api/aurora-cards", auroraCardsRoutes);

/* ----------------------------------------------------
   Error Handling Middleware
----------------------------------------------------- */
app.use((err, req, res, next) => {
  console.error("Error:", err);
  res.status(err.status || 500).json({
    message: err.message || "Internal server error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

/* ----------------------------------------------------
   404 Handler
----------------------------------------------------- */
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

/* ----------------------------------------------------
   Server Start
----------------------------------------------------- */
const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

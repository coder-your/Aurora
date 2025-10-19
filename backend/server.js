// server.js
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { pool } from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import profileRoutes from "./routes/profileRoutes.js";

dotenv.config();

const app = express();

// CORS setup
app.use(cors({
  origin: "*", // Change to your frontend URL in production
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

// Middleware to parse JSON
app.use(express.json());

// Test route
app.get("/", (req, res) => res.send("Aurora API running ✦"));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);

// Server start
const PORT = process.env.PORT || 5000;

app.listen(PORT, async () => {
  try {
    await pool.connect();
    console.log("✅ Database connected");
  } catch (err) {
    console.error("❌ DB connection error:", err.message);
  }
  console.log(`🚀 Server running on port ${PORT}`);
});

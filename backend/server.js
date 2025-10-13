import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { pool } from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// --- Root route ---
app.get("/", (req, res) => res.send("Aurora API running ✦"));

// --- Auth Routes ---
app.use("/api", authRoutes);

// --- Server start ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, async () => {
  try {
    await pool.connect();
    console.log(" Database connected");
  } catch (err) {
    console.error(" DB connection error:", err.message);
  }
  console.log(` Server running on port ${PORT}`);
});

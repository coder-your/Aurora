import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { pool } from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";

dotenv.config();

const app = express();

app.use(cors({
  origin: "*", // allow all origins (you can change this later to your frontend URL)
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

app.use(express.json());

app.get("/", (req, res) => res.send("Aurora API running ✦"));
app.use("/api", authRoutes);

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

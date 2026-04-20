import pkg from "pg";
const { Pool } = pkg;
import dotenv from "dotenv";
dotenv.config();

const shouldUseSsl = () => {
  const flag = (process.env.DB_SSL || "").toString().toLowerCase();
  if (["1", "true", "yes", "require"].includes(flag)) return true;
  if (process.env.NODE_ENV === "production") return true;
  const url = (process.env.DATABASE_URL || "").toString().toLowerCase();
  if (url.includes("sslmode=require")) return true;
  return false;
};

export const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  ...(shouldUseSsl() ? { ssl: { rejectUnauthorized: false } } : {}),
});

import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";

dotenv.config();

const hasPoolEnv =
  process.env.DB_USER &&
  process.env.DB_PASSWORD &&
  process.env.DB_HOST &&
  process.env.DB_PORT &&
  process.env.DB_NAME;

if (hasPoolEnv) {
  const user = encodeURIComponent(process.env.DB_USER);
  const pass = encodeURIComponent(process.env.DB_PASSWORD);
  const host = process.env.DB_HOST;
  const port = process.env.DB_PORT;
  const name = process.env.DB_NAME;
  const useSsl =
    String(process.env.DB_SSL || "").toLowerCase() === "true" ||
    (host !== "localhost" && host !== "127.0.0.1");

  process.env.DATABASE_URL = `postgresql://${user}:${pass}@${host}:${port}/${name}${
    useSsl ? "?sslmode=require" : ""
  }`;
}

const prisma = new PrismaClient();

export default prisma;

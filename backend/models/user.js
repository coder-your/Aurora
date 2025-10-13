import { pool } from "../config/db.js";

export const findUserByEmail = async (email) => {
  const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
  return result.rows[0];
};

export const insertUser = async (first_name, last_name, email, password_hash) => {
  await pool.query(
    "INSERT INTO users (first_name, last_name, email, password_hash) VALUES ($1, $2, $3, $4)",
    [first_name, last_name, email, password_hash]
  );
};

export const updateResetToken = async (email, token) => {
  await pool.query("UPDATE users SET reset_token = $1 WHERE email = $2", [token, email]);
};

export const updatePassword = async (email, password_hash) => {
  await pool.query("UPDATE users SET password_hash = $1, reset_token = NULL WHERE email = $2", [
    password_hash,
    email,
  ]);
};

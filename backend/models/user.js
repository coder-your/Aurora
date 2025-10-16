import { pool } from "../config/db.js";

export const findUserByEmail = async (email) => {
  const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
  return result.rows[0];
};

export const insertUser = async (first_name, last_name, email, password_hash, verification_token) => {
  await pool.query(
    "INSERT INTO users (first_name, last_name, email, password_hash, verification_token) VALUES ($1, $2, $3, $4, $5)",
    [first_name, last_name, email, password_hash, verification_token]
  );
};

export const updateResetToken = async (email, token) => {
  const expiry = new Date(Date.now() + 3600000); // 1 hour from now
  await pool.query(
    "UPDATE users SET reset_token = $1, reset_token_expires = $2 WHERE email = $3",
    [token, expiry, email]
  );
};

export const updatePassword = async (email, password_hash) => {
  await pool.query(
    "UPDATE users SET password_hash = $1, reset_token = NULL, reset_token_expires = NULL WHERE email = $2",
    [password_hash, email]
  );
};



export const findUserByVerificationToken = async (token) => {
  const result = await pool.query("SELECT * FROM users WHERE verification_token = $1", [token]);
  return result.rows[0];
};

export const verifyUser = async (token) => {
  await pool.query("UPDATE users SET is_verified = TRUE, verification_token = NULL WHERE verification_token = $1", [token]);
};

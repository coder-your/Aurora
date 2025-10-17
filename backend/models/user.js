import { pool } from "../config/db.js";

// --- Find user by email ---
export const findUserByEmail = async (email) => {
  const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
  return result.rows[0];
};

// --- Insert new user ---
export const insertUser = async (first_name, last_name, email, password_hash, verification_token) => {
  await pool.query(
    "INSERT INTO users (first_name, last_name, email, password_hash, verification_token) VALUES ($1, $2, $3, $4, $5)",
    [first_name, last_name, email, password_hash, verification_token]
  );
};

// --- Update password reset token ---
export const updateResetToken = async (email, token) => {
  const expiry = new Date(Date.now() + 3600000); // 1 hour
  await pool.query(
    "UPDATE users SET reset_token = $1, reset_token_expires = $2 WHERE email = $3",
    [token, expiry, email]
  );
};

// --- Update password ---
export const updatePassword = async (email, password_hash) => {
  await pool.query(
    "UPDATE users SET password_hash = $1, reset_token = NULL, reset_token_expires = NULL WHERE email = $2",
    [password_hash, email]
  );
};

// --- Find by verification token ---
export const findUserByVerificationToken = async (token) => {
  const result = await pool.query("SELECT * FROM users WHERE verification_token = $1", [token]);
  return result.rows[0];
};

// --- Verify user account ---
export const verifyUser = async (token) => {
  await pool.query(
    "UPDATE users SET is_verified = TRUE, verification_token = NULL WHERE verification_token = $1",
    [token]
  );
};

// --- Set 2FA OTP ---
export const setTwoFactorCode = async (email, code, expiry) => {
  await pool.query(
    "UPDATE users SET two_factor_code = $1, two_factor_expires = $2 WHERE email = $3",
    [code, expiry, email]
  );
};

// --- Verify 2FA OTP ---
export const verifyTwoFactorCode = async (email, code) => {
  const result = await pool.query(
    "SELECT two_factor_code, two_factor_expires FROM users WHERE email = $1",
    [email]
  );
  const user = result.rows[0];
  if (!user || user.two_factor_code !== code) return false;
  if (new Date() > new Date(user.two_factor_expires)) return false;

  // Clear OTP after successful verification
  await pool.query(
    "UPDATE users SET two_factor_code = NULL, two_factor_expires = NULL WHERE email = $1",
    [email]
  );

  return true;
};

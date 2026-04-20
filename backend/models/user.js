import { pool } from "../config/db.js";

// ------------------ FIND USER BY EMAIL ------------------
export const findUserByEmail = async (email) => {
  const result = await pool.query(
    "SELECT * FROM users WHERE email = $1 LIMIT 1",
    [email]
  );
  return result.rows[0];
};

// ------------------ INSERT NEW USER ------------------
export const insertUser = async (
  first_name,
  last_name,
  email,
  password_hash,
  verification_token
) => {
  await pool.query(
    `INSERT INTO users (first_name, last_name, email, password_hash, verification_token)
     VALUES ($1, $2, $3, $4, $5)`,
    [first_name, last_name, email, password_hash, verification_token]
  );
};

// ------------------ UPDATE PASSWORD RESET TOKEN ------------------
export const updateResetToken = async (email, token) => {
  const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  await pool.query(
    `UPDATE users 
     SET reset_token = $1, reset_token_expires = $2 
     WHERE email = $3`,
    [token, expiry, email]
  );
};

// ------------------ UPDATE PASSWORD ------------------
export const updatePassword = async (email, password_hash) => {
  await pool.query(
    `UPDATE users 
     SET password_hash = $1, reset_token = NULL, reset_token_expires = NULL 
     WHERE email = $2`,
    [password_hash, email]
  );
};

// ------------------ FIND USER BY VERIFICATION TOKEN ------------------
export const findUserByVerificationToken = async (token) => {
  const result = await pool.query(
    "SELECT * FROM users WHERE verification_token = $1 LIMIT 1",
    [token]
  );
  return result.rows[0];
};

// ------------------ VERIFY USER ACCOUNT ------------------
export const verifyUser = async (token) => {
  await pool.query(
    `UPDATE users 
     SET is_verified = TRUE, verification_token = NULL 
     WHERE verification_token = $1`,
    [token]
  );
};

// ------------------ MARK USER VERIFIED BY EMAIL ------------------
export const markUserVerifiedByEmail = async (email) => {
  await pool.query(
    `UPDATE users 
     SET is_verified = TRUE, verification_token = NULL 
     WHERE email = $1`,
    [email]
  );
};

// ------------------ SET 2FA OTP ------------------
export const setTwoFactorCode = async (email, code, expiry) => {
  await pool.query(
    `UPDATE users 
     SET two_factor_code = $1, two_factor_expires = $2 
     WHERE email = $3`,
    [code, expiry, email]
  );
};

// ------------------ VERIFY 2FA OTP ------------------

export const verifyTwoFactorCode = async (email, code) => {
  const result = await pool.query(
    `SELECT two_factor_code, two_factor_expires 
     FROM users 
     WHERE email = $1`,
    [email]
  );
  const user = result.rows[0];

  if (!user) return false;

  // Convert both to string for strict match
  const storedCode = String(user.two_factor_code).trim();
  const inputCode = String(code).trim();

  if (storedCode !== inputCode) return false;

  // Expiry check
  if (new Date() > new Date(user.two_factor_expires)) return false;

  // Clear OTP after success
  await pool.query(
    `UPDATE users 
     SET two_factor_code = NULL, two_factor_expires = NULL 
     WHERE email = $1`,
    [email]
  );

  return true;
};

// ------------------ CLEAR EXPIRED OTPs (OPTIONAL CLEANUP) ------------------
export const clearExpired2FA = async () => {
  await pool.query(
    `UPDATE users 
     SET two_factor_code = NULL, two_factor_expires = NULL 
     WHERE two_factor_expires < NOW()`
  );
};

// ------------------ INSERT SOCIAL USER ------------------
export const insertSocialUser = async (
  first_name,
  last_name,
  email,
  password_hash
) => {
  await pool.query(
    `INSERT INTO users (first_name, last_name, email, password_hash, verification_token, is_verified)
     VALUES ($1, $2, $3, $4, NULL, TRUE)`,
    [first_name, last_name, email, password_hash]
  );
};

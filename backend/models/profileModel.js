
import { pool } from "../config/db.js";

/* Profile CRUD queries */

// Create profile 
export const createProfile = async (user_id, fields = {}) => {
  const {
    first_name = null,
    last_name = null,
    handle_name = null,
    nickname = null,
    pronouns = null,
    bio = null,
    gender = null,
    profile_image = null,
  } = fields;

  const result = await pool.query(
    `INSERT INTO user_profiles
      (user_id, first_name, last_name, handle_name, nickname, pronouns, bio, gender, profile_image)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     RETURNING *`,
    [user_id, first_name, last_name, handle_name, nickname, pronouns, bio, gender, profile_image]
  );
  return result.rows[0];
};

export const getProfileByUserId = async (user_id) => {
  const result = await pool.query(
    `SELECT * FROM user_profiles WHERE user_id = $1`,
    [user_id]
  );
  return result.rows[0];
};

export const getProfileById = async (profile_id) => {
  const result = await pool.query(
    `SELECT * FROM user_profiles WHERE profile_id = $1`,
    [profile_id]
  );
  return result.rows[0];
};

export const getAllProfiles = async () => {
  const result = await pool.query(`SELECT * FROM user_profiles ORDER BY created_at DESC`);
  return result.rows;
};

export const updateProfileById = async (profile_id, fields = {}) => {
  const {
    first_name,
    last_name,
    handle_name,
    nickname,
    pronouns,
    bio,
    gender,
    profile_image,
    total_books_read,
    total_books_written,
    role,
    is_suspended
  } = fields;

  const result = await pool.query(
    `UPDATE user_profiles SET
      first_name = COALESCE($1, first_name),
      last_name = COALESCE($2, last_name),
      handle_name = COALESCE($3, handle_name),
      nickname = COALESCE($4, nickname),
      pronouns = COALESCE($5, pronouns),
      bio = COALESCE($6, bio),
      gender = COALESCE($7, gender),
      profile_image = COALESCE($8, profile_image),
      total_books_read = COALESCE($9, total_books_read),
      total_books_written = COALESCE($10, total_books_written),
      role = COALESCE($11, role),
      is_suspended = COALESCE($12, is_suspended),
      updated_at = CURRENT_TIMESTAMP
     WHERE profile_id = $13
     RETURNING *`,
    [first_name, last_name, handle_name, nickname, pronouns, bio, gender, profile_image, total_books_read, total_books_written, role, is_suspended, profile_id]
  );

  return result.rows[0];
};

export const updateProfileByUserId = async (user_id, fields = {}) => {
  const {
    first_name,
    last_name,
    handle_name,
    nickname,
    pronouns,
    bio,
    gender,
    profile_image
  } = fields;

  const result = await pool.query(
    `UPDATE user_profiles SET
      first_name = COALESCE($1, first_name),
      last_name = COALESCE($2, last_name),
      handle_name = COALESCE($3, handle_name),
      nickname = COALESCE($4, nickname),
      pronouns = COALESCE($5, pronouns),
      bio = COALESCE($6, bio),
      gender = COALESCE($7, gender),
      profile_image = COALESCE($8, profile_image),
      updated_at = CURRENT_TIMESTAMP
     WHERE user_id = $9
     RETURNING *`,
    [first_name, last_name, handle_name, nickname, pronouns, bio, gender, profile_image, user_id]
  );

  return result.rows[0];
};

export const deleteProfileByUserId = async (user_id) => {
  const result = await pool.query(
    `DELETE FROM user_profiles WHERE user_id = $1 RETURNING *`,
    [user_id]
  );
  return result.rows[0];
};

export const deleteProfileById = async (profile_id) => {
  const result = await pool.query(
    `DELETE FROM user_profiles WHERE profile_id = $1 RETURNING *`,
    [profile_id]
  );
  return result.rows[0];
};

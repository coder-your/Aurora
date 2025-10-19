import { pool } from "../config/db.js";

const Profile = {
  async create({
    user_id,
    first_name = null,
    last_name = null,
    handle_name = null,
    nickname = null,
    pronouns = null,
    bio = null,
    gender = null,
    profile_image = null,
    role = "reader",
    total_books_read = 0,
    total_books_written = 0,
  }) {
    const query = `
      INSERT INTO user_profiles
        (user_id, first_name, last_name, handle_name, nickname, pronouns, bio, gender, profile_image, role, total_books_read, total_books_written)
      VALUES
        ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
      RETURNING *;
    `;
    const values = [
      user_id,
      first_name,
      last_name,
      handle_name,
      nickname,
      pronouns,
      bio,
      gender,
      profile_image,
      role,
      total_books_read,
      total_books_written,
    ];

    const { rows } = await pool.query(query, values);
    return rows[0];
  },

  async findByProfileId(profile_id) {
    const { rows } = await pool.query(
      `SELECT * FROM user_profiles WHERE profile_id = $1;`,
      [profile_id]
    );
    return rows[0] || null;
  },

  async findByHandleName(handle_name) {
  const { rows } = await pool.query(
    `SELECT * FROM user_profiles WHERE handle_name = $1;`,
    [handle_name]
  );
  return rows[0] || null;
},


  async findByUserId(user_id) {
    const { rows } = await pool.query(
      `SELECT * FROM user_profiles WHERE user_id = $1;`,
      [user_id]
    );
    return rows[0] || null;
  },

  async update(profile_id, fields = {}) {
    const allowed = [
      "first_name",
      "last_name",
      "handle_name",
      "nickname",
      "pronouns",
      "bio",
      "gender",
      "profile_image",
      "total_books_read",
      "total_books_written",
      "role",
      "is_suspended",
    ];
    const set = [];
    const values = [];
    let idx = 1;

    for (const key of Object.keys(fields)) {
      if (!allowed.includes(key)) continue;
      set.push(`${key} = $${idx}`);
      values.push(fields[key]);
      idx++;
    }

    if (set.length === 0) {
      return this.findByProfileId(profile_id);
    }

    set.push(`updated_at = CURRENT_TIMESTAMP`);

    const query = `
      UPDATE user_profiles
      SET ${set.join(", ")}
      WHERE profile_id = $${idx}
      RETURNING *;
    `;
    values.push(profile_id);

    const { rows } = await pool.query(query, values);
    return rows[0] || null;
  },

  async remove(profile_id) {
    const { rows } = await pool.query(
      `DELETE FROM user_profiles WHERE profile_id = $1 RETURNING *;`,
      [profile_id]
    );
    return rows[0] || null;
  },

  async list({ limit = 20, offset = 0 } = {}) {
    const { rows } = await pool.query(
      `SELECT * FROM user_profiles ORDER BY created_at DESC LIMIT $1 OFFSET $2;`,
      [limit, offset]
    );
    return rows;
  },
};

export default Profile;

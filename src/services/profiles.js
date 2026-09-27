import { getDatabase } from '../database/connection.js';

export const profilesService = {
  async create(data) {
    const pool = getDatabase();
    const res = await pool.query(`INSERT INTO profiles (nome, email, ruolo, created_at) VALUES ($1, $2, $3, now()) RETURNING *`, [data.nome, data.email, data.ruolo || 'affittuario']);
    return res.rows[0];
  },

  async findByEmail(email) {
    const pool = getDatabase();
    const res = await pool.query('SELECT * FROM profiles WHERE email = $1', [email]);
    return res.rows[0];
  },

  async findById(id) {
    const pool = getDatabase();
    const res = await pool.query('SELECT * FROM profiles WHERE id = $1', [id]);
    return res.rows[0];
  },

  async isQuestionnaireCompleted(profileId) {
    const pool = getDatabase();
    const res = await pool.query('SELECT COUNT(*) FROM answers WHERE profile_id = $1', [profileId]);
    return Number(res.rows[0].count) > 0;
  }
};

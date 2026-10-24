import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../database/connection.js';

export const profilesService = {
  // Crea un nuovo profilo utente
  async create(profileData) {
    const pool = getDatabase();

    const profileId = uuidv4();

    const result = await pool.query(
      `INSERT INTO profiles (id, nome, cognome, eta, email, ruolo, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, now())
       ON CONFLICT (email) DO NOTHING
       RETURNING id, nome, cognome, eta, email, ruolo`,
      [profileId, profileData.nome, profileData.cognome, profileData.eta ?? 0, profileData.email, profileData.ruolo]
    );

    if (result.rows[0]) return result.rows[0];
    return this.findByEmail(profileData.email);
  },

  // Trova un profilo per ID
  async findById(profileId) {
    const pool = getDatabase();
    const res = await pool.query('SELECT * FROM profiles WHERE id = $1', [profileId]);
    return res.rows[0];
  },

  // Trova un profilo per email
  async findByEmail(email) {
    const pool = getDatabase();
    const res = await pool.query('SELECT * FROM profiles WHERE email = $1', [email]);
    return res.rows[0];
  },

};

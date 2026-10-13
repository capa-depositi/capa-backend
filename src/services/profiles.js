import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../database/connection.js';

export const profilesService = {
  // Crea un nuovo profilo utente
  async create(profileData) {
    const pool = getDatabase();

    const profileId = uuidv4();

    await pool.query(
      `INSERT INTO profiles (id, nome, cognome, eta, email, ruolo, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, now())`,
      [profileId, profileData.nome, profileData.cognome, profileData.eta ?? 0, profileData.email, profileData.ruolo]
    );

    return { id: profileId, ...profileData };
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

  // Verifica se il questionario è completato per un profilo
  async isQuestionnaireCompleted(profileId) {
    const pool = getDatabase();
    const requiredQuestions = ['Q1_AFF', 'Q4_AFF', 'Q5_AFF', 'Q6_AFF'];

    const res = await pool.query('SELECT question_id FROM answers WHERE profile_id = $1', [profileId]);
    const answeredQuestions = new Set(res.rows.map(r => r.question_id));

    for (const q of requiredQuestions) {
      if (!answeredQuestions.has(q)) return false;
    }

    return true;
  }
};

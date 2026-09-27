import { getDatabase } from '../database/connection.js';

export const answersService = {
  // Salva una risposta al questionario
  async save(answerData) {
    const pool = getDatabase();

    // Verifica che il profilo esista
    const profileRes = await pool.query('SELECT id FROM profiles WHERE id = $1', [answerData.profileId]);
    if (!profileRes.rows[0]) throw new Error('Profile not found');

    const existingRes = await pool.query('SELECT id FROM answers WHERE profile_id = $1 AND question_id = $2', [answerData.profileId, answerData.questionId]);

    if (existingRes.rows[0]) {
      await pool.query('UPDATE answers SET answer_value = $1, created_at = now() WHERE id = $2', [answerData.value, existingRes.rows[0].id]);
      return;
    }

    await pool.query('INSERT INTO answers (profile_id, question_id, answer_value, created_at) VALUES ($1, $2, $3, now())', [answerData.profileId, answerData.questionId, answerData.value]);
  },

  // Ottieni tutte le risposte per un profilo
  async getByProfileId(profileId) {
    const pool = getDatabase();
    const res = await pool.query('SELECT * FROM answers WHERE profile_id = $1 ORDER BY created_at', [profileId]);
    return res.rows;
  }
};

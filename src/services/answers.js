import { getDatabase } from '../database/connection.js';

export const answersService = {
  // Salva una risposta al questionario
  async save(answerData) {
    const pool = getDatabase();
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const submissionRes = await client.query(
        'SELECT status FROM questionnaire_submissions WHERE id = $1 FOR UPDATE',
        [answerData.submissionId]
      );
      if (!submissionRes.rows[0]) throw new Error('Submission not found');
      if (submissionRes.rows[0].status !== 'in_progress') throw new Error('Submission is complete');

      await client.query(
        `INSERT INTO answers (submission_id, question_id, answer_value, created_at)
         VALUES ($1, $2, $3, now())
         ON CONFLICT (submission_id, question_id)
         DO UPDATE SET answer_value = EXCLUDED.answer_value, created_at = now()`,
        [answerData.submissionId, answerData.questionId, answerData.value]
      );
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  // Ottieni tutte le risposte per una submission
  async getBySubmissionId(submissionId) {
    const pool = getDatabase();
    const res = await pool.query('SELECT * FROM answers WHERE submission_id = $1 ORDER BY created_at', [submissionId]);
    return res.rows;
  }
};

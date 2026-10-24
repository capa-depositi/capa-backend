import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../database/connection.js';
import { isSubmissionComplete } from './submissionRules.js';

export const submissionsService = {
  async create(profileId) {
    const pool = getDatabase();
    const profile = await pool.query('SELECT id FROM profiles WHERE id = $1', [profileId]);
    if (!profile.rows[0]) throw new Error('Profile not found');

    const id = uuidv4();
    await pool.query(
      'INSERT INTO questionnaire_submissions (id, profile_id) VALUES ($1, $2)',
      [id, profileId]
    );
    return { id, profileId, status: 'in_progress' };
  },

  async complete(submissionId) {
    const pool = getDatabase();
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const submissionRes = await client.query(
        'SELECT id, profile_id, status, email_status FROM questionnaire_submissions WHERE id = $1 FOR UPDATE',
        [submissionId]
      );
      const submission = submissionRes.rows[0];
      if (!submission) throw new Error('Submission not found');

      if (submission.status === 'completed') {
        await client.query('COMMIT');
        return { completed: true, ...submission };
      }

      const [questionRes, answerRes] = await Promise.all([
        client.query('SELECT id, required, depends_on, depends_value FROM questions ORDER BY id'),
        client.query(
        'SELECT question_id, answer_value FROM answers WHERE submission_id = $1',
        [submissionId]
        )
      ]);
      const answers = new Map(answerRes.rows.map(answer => [answer.question_id, answer.answer_value]));

      if (!isSubmissionComplete(questionRes.rows, answers)) {
        await client.query('COMMIT');
        return { completed: false, status: submission.status, emailStatus: submission.email_status };
      }

      const updatedRes = await client.query(
        `UPDATE questionnaire_submissions
         SET status = 'completed', completed_at = COALESCE(completed_at, now())
         WHERE id = $1
         RETURNING id, profile_id, status, email_status`,
        [submissionId]
      );
      await client.query('COMMIT');
      return { completed: true, ...updatedRes.rows[0] };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  async claimEmailAttempt(submissionId) {
    const pool = getDatabase();
    const attemptId = uuidv4();
    const res = await pool.query(
      `UPDATE questionnaire_submissions
       SET email_status = 'sending', email_attempted_at = now(), email_attempt_id = $2, email_error = NULL
       WHERE id = $1
         AND status = 'completed'
         AND (
           email_status IN ('not_sent', 'failed')
           OR (email_status = 'sending' AND email_attempted_at < now() - interval '5 minutes')
         )
       RETURNING id`,
      [submissionId, attemptId]
    );
    return res.rowCount === 1 ? attemptId : null;
  },

  async recordEmailResult(submissionId, attemptId, { sent, error }) {
    const pool = getDatabase();
    await pool.query(
      `UPDATE questionnaire_submissions
       SET email_status = $2, email_error = $3
       WHERE id = $1 AND email_attempt_id = $4`,
      [submissionId, sent ? 'sent' : 'failed', error ? String(error.message || error) : null, attemptId]
    );
  },

  async getById(submissionId) {
    const pool = getDatabase();
    const res = await pool.query(
      `SELECT s.id, s.profile_id, s.status, s.email_status, p.nome, p.email
       FROM questionnaire_submissions s
       JOIN profiles p ON p.id = s.profile_id
       WHERE s.id = $1`,
      [submissionId]
    );
    return res.rows[0];
  }
};

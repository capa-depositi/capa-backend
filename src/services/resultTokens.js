import { randomBytes, createHash } from 'crypto';
import { getDatabase } from '../database/connection.js';

const TOKEN_TTL_DAYS = 30;

function hashToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

export const resultTokensService = {
  // Create a fresh link for each email attempt so failed sends can be retried.
  async create(submissionId) {
    const pool = getDatabase();
    const token = randomBytes(32).toString('base64url');
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();

    await pool.query(
      'INSERT INTO result_tokens (submission_id, token_hash, expires_at) VALUES ($1, $2, $3)',
      [submissionId, tokenHash, expiresAt]
    );

    return { token, expiresAt, ttlDays: TOKEN_TTL_DAYS };
  },

  // Resolve a result link and count the visit.
  async resolve(token) {
    const pool = getDatabase();
    const tokenHash = hashToken(token);
    const recordRes = await pool.query('SELECT * FROM result_tokens WHERE token_hash = $1', [tokenHash]);
    const record = recordRes.rows[0];

    if (!record) return { error: 'not_found' };
    if (new Date(record.expires_at) < new Date()) return { error: 'expired' };

    await pool.query('UPDATE result_tokens SET view_count = view_count + 1, last_viewed_at = now() WHERE id = $1', [record.id]);

    return { submissionId: record.submission_id };
  },

  async getReturnCount(submissionId) {
    const pool = getDatabase();
    const res = await pool.query('SELECT COALESCE(SUM(view_count), 0) AS view_count FROM result_tokens WHERE submission_id = $1', [submissionId]);
    return Number(res.rows[0].view_count);
  }
};

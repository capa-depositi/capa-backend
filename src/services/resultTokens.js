import { randomBytes, createHash } from 'crypto';
import { getDatabase } from '../database/connection.js';

const TOKEN_TTL_DAYS = 30;

function hashToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

export const resultTokensService = {
  // Crea il token di accesso al risultato per il profilo, se non esiste già (invio email una tantum)
  async getOrCreate(profileId) {
    const pool = getDatabase();
    const existingRes = await pool.query('SELECT id FROM result_tokens WHERE profile_id = $1', [profileId]);
    if (existingRes.rows[0]) return { isNew: false };

    const token = randomBytes(32).toString('base64url');
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();

    await pool.query('INSERT INTO result_tokens (profile_id, token_hash, expires_at) VALUES ($1, $2, $3)', [profileId, tokenHash, expiresAt]);

    return { isNew: true, token, expiresAt, ttlDays: TOKEN_TTL_DAYS };
  },

  // Risolve un token in chiaro nel profilo associato e conta la visita come un "ritorno"
  async resolve(token) {
    const pool = getDatabase();
    const tokenHash = hashToken(token);
    const recordRes = await pool.query('SELECT * FROM result_tokens WHERE token_hash = $1', [tokenHash]);
    const record = recordRes.rows[0];

    if (!record) return { error: 'not_found' };
    if (new Date(record.expires_at) < new Date()) return { error: 'expired' };

    await pool.query('UPDATE result_tokens SET view_count = view_count + 1, last_viewed_at = now() WHERE id = $1', [record.id]);

    return { profileId: record.profile_id };
  },

  // Quante volte l'utente è tornato a rivedere il risultato tramite il link (0 = mai)
  async getReturnCount(profileId) {
    const pool = getDatabase();
    const res = await pool.query('SELECT view_count FROM result_tokens WHERE profile_id = $1', [profileId]);
    return res.rows[0] ? res.rows[0].view_count : 0;
  }
};

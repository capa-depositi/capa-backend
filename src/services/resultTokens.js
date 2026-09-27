import { getDatabase } from '../database/connection.js';
import { randomUUID } from 'crypto';

export const resultTokensService = {
  // Ottieni o crea un token per un profilo
  async getOrCreate(profileId) {
    const pool = getDatabase();

    // Controlla se esiste già un token valido
    const res = await pool.query('SELECT token, expires_at FROM result_tokens WHERE profile_id = $1 ORDER BY expires_at DESC LIMIT 1', [profileId]);
    if (res.rows[0]) {
      const row = res.rows[0];
      const now = new Date();
      if (new Date(row.expires_at) > now) {
        return { token: row.token, isNew: false, ttlDays: Math.ceil((new Date(row.expires_at) - now) / (1000 * 60 * 60 * 24)) };
      }
    }

    // Crea un nuovo token
    const token = randomUUID();
    const ttlDays = Number(process.env.RESULT_TOKEN_TTL_DAYS || 30);
    const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);

    await pool.query('INSERT INTO result_tokens (profile_id, token, expires_at, created_at) VALUES ($1, $2, $3, now())', [profileId, token, expiresAt]);

    return { token, isNew: true, ttlDays };
  },

  async resolve(token) {
    const pool = getDatabase();
    const res = await pool.query('SELECT profile_id, expires_at FROM result_tokens WHERE token = $1 LIMIT 1', [token]);
    if (!res.rows[0]) return { error: 'not_found' };
    const row = res.rows[0];
    const now = new Date();
    if (new Date(row.expires_at) < now) return { error: 'expired' };
    return { profileId: row.profile_id };
  }
};

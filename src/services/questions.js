import { getDatabase } from '../database/connection.js';

export const questionsService = {
  // In questo progetto al momento c'è un solo questionario (affittuario)
  async getByRole() {
    const pool = getDatabase();
    const res = await pool.query('SELECT * FROM questions ORDER BY id');
    return res.rows;
  }
};

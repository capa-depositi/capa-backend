import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { Pool } from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../database/.env') });
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL not set in database/.env');
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

(async () => {
  console.log('Profiles:');
  const profiles = await pool.query('SELECT id, nome, cognome, email, ruolo FROM profiles');
  console.table(profiles.rows);

  console.log('\nAnswers:');
  const answers = await pool.query('SELECT id, profile_id, question_id, answer_value FROM answers');
  console.table(answers.rows);

  console.log('\nResult tokens:');
  const tokens = await pool.query(`SELECT profile_id, view_count, last_viewed_at, expires_at FROM result_tokens`);
  console.table(tokens.rows);

  await pool.end();
})();

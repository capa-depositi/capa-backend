import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { getDatabase, closeDatabase } from '../src/database/connection.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pool = getDatabase();

(async () => {
  console.log('Profiles:');
  const profiles = await pool.query('SELECT id, nome, cognome, email, ruolo FROM profiles');
  console.table(profiles.rows);

  console.log('\nAnswers:');
  const answers = await pool.query('SELECT id, submission_id, question_id, answer_value FROM answers');
  console.table(answers.rows);

  console.log('\nQuestionnaire submissions:');
  const submissions = await pool.query('SELECT id, profile_id, status, email_status, email_error, created_at FROM questionnaire_submissions');
  console.table(submissions.rows);

  console.log('\nResult tokens:');
  const tokens = await pool.query(`SELECT submission_id, view_count, last_viewed_at, expires_at FROM result_tokens`);
  console.table(tokens.rows);

  await closeDatabase();
})();

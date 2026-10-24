import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getDatabase, closeDatabase } from '../src/database/connection.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not configured in the backend or capa-database .env file.');
  process.exit(1);
}

const pool = getDatabase();

console.log('🚀 Inizializzazione database CAPA (Postgres) — applicando migrazioni SQL...');

// CAPA's schema baseline and seed files live in the sibling capa-database directory.
const migrationsDir = path.join(__dirname, '../../capa-database');

async function applyMigrations() {
  if (!fs.existsSync(migrationsDir)) {
    console.warn(`Migrations folder not found at ${migrationsDir}. Falling back to inline creation.`);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS profiles (
        id UUID PRIMARY KEY,
        nome TEXT NOT NULL,
        cognome TEXT NOT NULL,
        eta INTEGER NOT NULL,
        email TEXT UNIQUE NOT NULL,
        ruolo TEXT NOT NULL CHECK (ruolo IN ('affittuario')),
        created_at TIMESTAMPTZ DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS questionnaire_submissions (
        id UUID PRIMARY KEY,
        profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed')),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        completed_at TIMESTAMPTZ,
        email_status TEXT NOT NULL DEFAULT 'not_sent' CHECK (email_status IN ('not_sent', 'sending', 'sent', 'failed')),
        email_attempted_at TIMESTAMPTZ,
        email_attempt_id UUID,
        email_error TEXT
      );

      CREATE TABLE IF NOT EXISTS answers (
        id SERIAL PRIMARY KEY,
        submission_id UUID NOT NULL REFERENCES questionnaire_submissions(id) ON DELETE CASCADE,
        question_id TEXT NOT NULL,
        answer_value TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT now(),
        CONSTRAINT uq_submission_question UNIQUE (submission_id, question_id)
      );

      CREATE TABLE IF NOT EXISTS questions (
        id TEXT PRIMARY KEY,
        role TEXT NOT NULL,
        question_text TEXT NOT NULL,
        question_type TEXT NOT NULL,
        options TEXT,
        required BOOLEAN DEFAULT TRUE,
        depends_on TEXT,
        depends_value TEXT
      );

      CREATE TABLE IF NOT EXISTS legal_rates (
        year INTEGER PRIMARY KEY,
        rate REAL NOT NULL
      );

      CREATE TABLE IF NOT EXISTS result_tokens (
        id SERIAL PRIMARY KEY,
        submission_id UUID NOT NULL REFERENCES questionnaire_submissions(id) ON DELETE CASCADE,
        token_hash TEXT NOT NULL UNIQUE,
        created_at TIMESTAMPTZ DEFAULT now(),
        expires_at TIMESTAMPTZ NOT NULL,
        view_count INTEGER NOT NULL DEFAULT 0,
        last_viewed_at TIMESTAMPTZ
      );

      CREATE INDEX IF NOT EXISTS idx_questionnaire_submissions_profile_id ON questionnaire_submissions(profile_id);
      CREATE INDEX IF NOT EXISTS idx_answers_submission_id ON answers(submission_id);
      CREATE INDEX IF NOT EXISTS idx_result_tokens_submission ON result_tokens(submission_id);
    `);
    console.log('✅ Inline tables created');
    return;
  }

  const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();
  console.log(`Found ${files.length} migration(s) in ${migrationsDir}`);
  for (const file of files) {
    const filePath = path.join(migrationsDir, file);
    console.log(`📦 Applicazione migration: ${file}`);
    const sql = fs.readFileSync(filePath, 'utf8');
    if (!sql.trim()) {
      console.log(`⚠️ Skipping empty migration ${file}`);
      continue;
    }
    try {
      await pool.query(sql);
      console.log(`✅ Applied ${file}`);
    } catch (err) {
      console.error(`❌ Error applying ${file}:`, err.message);
      throw err;
    }
  }
}

try {
  await applyMigrations();
  console.log('✅ Database initialized successfully.');
} catch (err) {
  console.error('❌ Migration failed:', err.message);
  await closeDatabase();
  process.exit(1);
}

await closeDatabase();

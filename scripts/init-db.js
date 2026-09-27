import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { Pool } from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load DATABASE_URL from database/.env
dotenv.config({ path: path.join(__dirname, '../../database/.env') });

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL not set in database/.env');
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

console.log('🚀 Inizializzazione database CAPA (Postgres) — applicando migrazioni SQL...');

// The project's canonical migrations live in `database/` root per repo convention
const migrationsDir = path.join(__dirname, '../../database');

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

      CREATE TABLE IF NOT EXISTS answers (
        id SERIAL PRIMARY KEY,
        profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        question_id TEXT NOT NULL,
        answer_value TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT now()
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
        profile_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
        token_hash TEXT NOT NULL UNIQUE,
        created_at TIMESTAMPTZ DEFAULT now(),
        expires_at TIMESTAMPTZ NOT NULL,
        view_count INTEGER NOT NULL DEFAULT 0,
        last_viewed_at TIMESTAMPTZ
      );

      CREATE INDEX IF NOT EXISTS idx_result_tokens_profile ON result_tokens(profile_id);
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
  await pool.end();
  process.exit(1);
}

await pool.end();

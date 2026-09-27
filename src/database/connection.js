import pkg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import dns from 'dns/promises';
import { fileURLToPath } from 'url';

const { Pool } = pkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Prefer a local .env in the backend project root (when running from that folder).
// Fallback to the shared database .env (either `capa-database` or `database`) if local file not present.
const localEnvPath = path.join(process.cwd(), '.env');
if (fs.existsSync(localEnvPath)) {
  dotenv.config({ path: localEnvPath });
} else {
  const candidate1 = path.join(__dirname, '../../../capa-database/.env');
  const candidate2 = path.join(__dirname, '../../../database/.env');
  if (fs.existsSync(candidate1)) {
    dotenv.config({ path: candidate1 });
  } else if (fs.existsSync(candidate2)) {
    dotenv.config({ path: candidate2 });
  } else {
    // Last resort: load default dotenv behaviour (process.cwd())
    dotenv.config();
  }
}

// If requested, disable Node TLS verification globally for development/testing.
// This must be set early so the pg client/TLS stack sees it before any sockets are opened.
if (process.env.DB_ALLOW_INSECURE_TLS === '1' || process.env.DB_ALLOW_INSECURE_TLS === 'true') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  console.warn('DB_ALLOW_INSECURE_TLS=1: NODE_TLS_REJECT_UNAUTHORIZED=0 (development only)');
}

// If the DATABASE_URL contains the placeholder 'REPLACE_ME' we allow injecting
// a password from the `DB_PASSWORD` env var so you can keep only the secret
// in the local `.env` file without editing the full connection string.
if (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('REPLACE_ME') && process.env.DB_PASSWORD) {
  const encoded = encodeURIComponent(process.env.DB_PASSWORD);
  process.env.DATABASE_URL = process.env.DATABASE_URL.replace('REPLACE_ME', encoded);
}

// If no DATABASE_URL is present but DB_* parts exist, construct the URL.
if (!process.env.DATABASE_URL && process.env.DB_HOST && process.env.DB_USER && process.env.DB_PASSWORD && process.env.DB_NAME) {
  const host = process.env.DB_HOST;
  const port = process.env.DB_PORT || '5432';
  const user = process.env.DB_USER;
  const db = process.env.DB_NAME;
  const pwd = encodeURIComponent(process.env.DB_PASSWORD);
  process.env.DATABASE_URL = `postgresql://${user}:${pwd}@${host}:${port}/${db}`;
}

// If hostname resolves only to IPv6 (common on some providers), resolve it
// and rewrite the DATABASE_URL to use an IPv6 literal so the client can connect
// from environments without working IPv4 DNS/pathing.
if (process.env.DATABASE_URL) {
  try {
    const urlObj = new URL(process.env.DATABASE_URL);
    const host = urlObj.hostname;
    const looksLikeIP = /^[0-9.]+$/.test(host) || host.includes(':');
    if (!looksLikeIP) {
      try {
        const res6 = await dns.lookup(host, { family: 6 });
        if (res6 && res6.address) {
          const auth = urlObj.username ? `${encodeURIComponent(urlObj.username)}${urlObj.password ? ':' + encodeURIComponent(urlObj.password) : ''}@` : '';
          const port = urlObj.port ? `:${urlObj.port}` : '';
          const pathname = urlObj.pathname || '';
          const search = urlObj.search || '';
          process.env.DATABASE_URL = `${urlObj.protocol}//${auth}[${res6.address}]${port}${pathname}${search}`;
          console.log('Rewrote DATABASE_URL to use IPv6 literal for host:', host);
        }
      } catch (e) {
        // ignore DNS lookup failures — leave original host
      }
    }
  } catch (e) {
    // ignore parsing errors
  }
}

let pool = null;

export function getDatabase() {
  if (!pool) {
    const poolConfig = { connectionString: process.env.DATABASE_URL };

    // For development/testing you can allow insecure TLS by setting
    // DB_ALLOW_INSECURE_TLS=1 in your .env. This will disable certificate
    // verification for the pg client (only use for local testing).
    if (process.env.DB_ALLOW_INSECURE_TLS === '1' || process.env.DB_ALLOW_INSECURE_TLS === 'true') {
      poolConfig.ssl = { rejectUnauthorized: false };
      console.warn('DB_ALLOW_INSECURE_TLS enabled: TLS certificate verification is disabled (development only).');
    }

    pool = new Pool(poolConfig);
  }

  return pool;
}

export async function closeDatabase() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

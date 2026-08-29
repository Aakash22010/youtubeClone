import fs from 'node:fs';
import path from 'node:path';
import { Pool, QueryResultRow } from 'pg';

const RETRY_MS = 10_000;
const isLocal = /localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL || '');

/**
 * TLS to Postgres, verified by default.
 *
 * Supabase signs the pooler certificate with its own CA, which is not in Node's
 * default trust store. Paste that CA (Supabase dashboard -> Settings -> Database
 * -> SSL Configuration, "Download certificate") into DATABASE_CA_CERT and the
 * connection is properly verified.
 *
 * DATABASE_SSL_INSECURE=1 skips verification. It exists so a broken CA cannot
 * take the site down at 2am, not as a default: it accepts any certificate, which
 * means anyone able to intercept the connection can read the database traffic.
 */
function sslConfig() {
  if (isLocal) return undefined;
  if (process.env.DATABASE_CA_CERT) {
    return { ca: process.env.DATABASE_CA_CERT.replace(/\\n/g, '\n') };
  }
  if (process.env.DATABASE_SSL_INSECURE === '1') {
    console.warn('DATABASE_SSL_INSECURE=1 — Postgres TLS certificate is NOT being verified.');
    return { rejectUnauthorized: false };
  }
  return true; // verify against Node's built-in CAs
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: sslConfig(),
  max: 5, // Supabase's free pooler is not generous; Render free runs one instance
});

/** Run a query. Thin wrapper so controllers never touch the pool directly. */
export const q = <T extends QueryResultRow = any>(text: string, params?: unknown[]) =>
  pool.query<T>(text, params);

/** First row, or null. The shape most controllers actually want. */
export const one = async <T extends QueryResultRow = any>(text: string, params?: unknown[]) =>
  (await q<T>(text, params)).rows[0] ?? null;

/** Names the client spells differently from plain camelCase. */
const RENAMES: Record<string, string> = {
  id: '_id',
  photoUrl: 'photoURL', // the Mongo document said photoURL, and 26 client files still do
  parentCommentId: 'parentComment',
};

const camel = (s: string) => s.replace(/_([a-z0-9])/g, (_m, c: string) => c.toUpperCase());
const key = (k: string) => RENAMES[k] ?? RENAMES[camel(k)] ?? camel(k);

/**
 * Postgres rows -> the document shape the client already expects.
 *
 * Renames `id` to `_id` and snake_case to camelCase, recursively, so the 26
 * client files that read `video._id` and `video.thumbnailUrl` keep working
 * against Postgres. Applies at every depth, so JSON built in SQL should use
 * snake_case keys too and gets converted by the same rule.
 */
export function doc(value: any): any {
  if (Array.isArray(value)) return value.map(doc);
  if (value === null || value instanceof Date || typeof value !== 'object') return value;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value)) out[key(k)] = doc(v);
  return out;
}

/** Applies schema.sql. Idempotent, so it runs on every boot and needs no migration step. */
export async function migrate(): Promise<void> {
  const sql = fs.readFileSync(path.join(__dirname, '../db/schema.sql'), 'utf8');
  await pool.query(sql);
}

const connectDB = async (): Promise<void> => {
  try {
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set');
    await migrate();
    const { rows } = await q<{ db: string }>('select current_database() as db');
    console.log(`Postgres connected: ${rows[0].db}`);
  } catch (error) {
    // Do not exit. A dead database must not take the web service down with it:
    // process.exit(1) here killed the listener a second after it bound, so Render
    // saw "no open ports detected" and failed the deploy instead of reporting the
    // real error. Retry instead, so the service recovers on its own once the DB is
    // reachable again.
    console.error(`Postgres connection error, retrying in ${RETRY_MS / 1000}s:`, error);
    setTimeout(connectDB, RETRY_MS).unref();
  }
};

export default connectDB;

import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
const { Pool } = await import('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1, application_name: 'curiosity-os-migrate' });
const dir = fileURLToPath(new URL('../db/migrations/', import.meta.url));

try {
  await pool.query(`create table if not exists schema_migrations(version text primary key, applied_at timestamptz not null default now())`);
  const applied = new Set((await pool.query(`select version from schema_migrations`)).rows.map((r) => r.version));
  for (const file of (await readdir(dir)).filter((x) => x.endsWith('.sql')).sort()) {
    if (applied.has(file)) continue;
    const sql = await readFile(join(dir, file), 'utf8');
    const client = await pool.connect();
    try {
      await client.query(sql);
      await client.query(`insert into schema_migrations(version) values($1) on conflict do nothing`, [file]);
      console.log(`applied ${file}`);
    } finally { client.release(); }
  }
} finally {
  await pool.end();
}

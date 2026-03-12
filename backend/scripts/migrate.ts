import pool from '../src/db';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const MIGRATIONS_DIR = path.join(__dirname, '../migrations');

async function migrate() {
  // Track which migrations have been applied
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version    TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ DEFAULT now()
    )
  `);

  const applied = await pool.query(`SELECT version FROM schema_migrations`);
  const appliedSet = new Set(applied.rows.map((r: any) => r.version));

  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort();

  let count = 0;
  for (const file of files) {
    if (appliedSet.has(file)) {
      console.log(`  skip  ${file}`);
      continue;
    }
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
    await pool.query(sql);
    await pool.query(`INSERT INTO schema_migrations (version) VALUES ($1)`, [file]);
    console.log(`  apply ${file}`);
    count++;
  }

  console.log(`\n✅ ${count} migration(s) applied`);
  process.exit(0);
}

migrate().catch(err => { console.error(err); process.exit(1); });

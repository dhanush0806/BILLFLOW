import fs from 'fs';
import path from 'path';
import { pool } from '../config/database';

export const runMigrations = async () => {
  console.log('🔄 Running database migrations...');
  const client = await pool.connect();

  try {
    // 1. Ensure migrations tracking table exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Fetch already applied migrations
    const appliedRes = await client.query('SELECT name FROM schema_migrations');
    const appliedSet = new Set(appliedRes.rows.map((r: { name: string }) => r.name));

    // 3. Read migration files in deterministic alphabetical order
    const migrationsDir = path.join(__dirname, 'migrations');
    const files = fs
      .readdirSync(migrationsDir)
      .filter((file) => file.endsWith('.sql'))
      .sort();

    for (const file of files) {
      if (appliedSet.has(file)) {
        console.log(`⏭️  Migration already applied: ${file} (skipped)`);
        continue;
      }

      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');
      console.log(`⏳ Applying migration: ${file}...`);

      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
        await client.query('COMMIT');
        console.log(`✅ Applied migration: ${file}`);
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`❌ Migration failed at ${file}:`, err);
        throw err;
      }
    }

    console.log('🎉 All pending migrations executed successfully.');
  } finally {
    client.release();
  }
};

if (require.main === module) {
  runMigrations()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

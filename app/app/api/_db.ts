import { Pool } from 'pg';

let pool: Pool | null = null;
let schemaReady: Promise<void> | null = null;

function getPool() {
  if (!pool) {
    const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('missing_connection_string: set POSTGRES_URL (direct)');
    }
    pool = new Pool({
      connectionString,
      // Neon requires SSL
      ssl: { rejectUnauthorized: false },
      max: 5,
    });
  }
  return pool;
}

export async function ensureSchema() {
  if (!schemaReady) {
    schemaReady = (async () => {
      const p = getPool();
      await p.query(`
        create table if not exists bounty_metadata (
          creator text not null,
          bounty_id text not null,
          title text not null,
          description text not null,
          created_at timestamptz not null default now(),
          primary key (creator, bounty_id)
        );
      `);
    })();
  }
  return schemaReady;
}

export async function query(text: string, params: any[] = []) {
  const p = getPool();
  return p.query(text, params);
}

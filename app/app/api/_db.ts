import { sql } from '@vercel/postgres';

let schemaReady: Promise<void> | null = null;

export function ensureSchema() {
  if (!schemaReady) {
    schemaReady = (async () => {
      await sql`
        create table if not exists bounty_metadata (
          creator text not null,
          bounty_id text not null,
          title text not null,
          description text not null,
          created_at timestamptz not null default now(),
          primary key (creator, bounty_id)
        );
      `;
    })();
  }
  return schemaReady;
}

export { sql };

import { NextResponse } from 'next/server';
import { ensureSchema, sql } from '../_db';

export async function POST(req: Request) {
  await ensureSchema();
  const body = await req.json();

  const creator = String(body.creator || '');
  const bounty_id = String(body.bounty_id || '');
  const title = String(body.title || '').slice(0, 200);
  const description = String(body.description || '').slice(0, 5000);

  if (!creator || !bounty_id || !title || !description) {
    return NextResponse.json({ ok: false, error: 'missing_fields' }, { status: 400 });
  }

  await sql`
    insert into bounty_metadata (creator, bounty_id, title, description)
    values (${creator}, ${bounty_id}, ${title}, ${description})
    on conflict (creator, bounty_id)
    do update set title = excluded.title, description = excluded.description;
  `;

  return NextResponse.json({ ok: true });
}

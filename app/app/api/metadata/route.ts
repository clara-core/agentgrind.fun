import { NextResponse } from 'next/server';
import { ensureSchema, query } from '../_db';

export async function POST(req: Request) {
  try {
    await ensureSchema();
    const raw = await req.text();
    const body = raw ? JSON.parse(raw) : {};

  const creator = String(body.creator || '');
  const bounty_id = String(body.bounty_id || '');
  const title = String(body.title || '').slice(0, 200);
  const description = String(body.description || '').slice(0, 5000);

  if (!creator || !bounty_id || !title || !description) {
    return NextResponse.json({ ok: false, error: 'missing_fields' }, { status: 400 });
  }

    await query(
      `insert into bounty_metadata (creator, bounty_id, title, description)
       values ($1, $2, $3, $4)
       on conflict (creator, bounty_id)
       do update set title = excluded.title, description = excluded.description;`,
      [creator, bounty_id, title, description]
    );

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: 'db_error', message: e?.message || String(e) },
      { status: 500 }
    );
  }
}

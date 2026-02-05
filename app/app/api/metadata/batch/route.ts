import { NextResponse } from 'next/server';
import { ensureSchema, sql } from '../../_db';

export async function POST(req: Request) {
  try {
    await ensureSchema();
    const body = await req.json();
  const keys = Array.isArray(body.keys) ? body.keys : [];

  // keys: [{creator,bounty_id}]
  const creatorSet = new Set<string>();
  const bountySet = new Set<string>();
  for (const k of keys) {
    if (!k) continue;
    const c = String(k.creator || '');
    const b = String(k.bounty_id || '');
    if (!c || !b) continue;
    creatorSet.add(c);
    bountySet.add(b);
  }

  if (creatorSet.size === 0 || bountySet.size === 0) {
    return NextResponse.json({ ok: true, items: [] });
  }

  const wanted = new Set(keys.map((k: any) => `${String(k.creator)}:${String(k.bounty_id)}`));

  // Simplicity first: fetch recent metadata and filter in-memory.
  // (Devnet scale is small; we can tighten query later.)
  const { rows } = await sql`
    select creator, bounty_id, title, description
    from bounty_metadata
    order by created_at desc
    limit 500;
  `;

    const filtered = rows.filter((r: any) => wanted.has(`${r.creator}:${r.bounty_id}`));
    return NextResponse.json({ ok: true, items: filtered });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: 'db_error', message: e?.message || String(e), items: [] },
      { status: 500 }
    );
  }
}

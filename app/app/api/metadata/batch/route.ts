import { NextResponse } from 'next/server';
import { ensureSchema, query } from '../../_db';

export async function POST(req: Request) {
  try {
    await ensureSchema();
    const raw = await req.text();
    const body = raw ? JSON.parse(raw) : {};
    const keys = Array.isArray((body as any).keys) ? (body as any).keys : [];

    if (keys.length === 0) {
      return NextResponse.json({ ok: true, items: [] });
    }

    // Build efficient SQL query using (creator, bounty_id) pairs
    // Use ANY with composite type for PostgreSQL
    const pairs = keys
      .map((k: any) => {
        const c = String(k.creator || '').trim();
        const b = String(k.bounty_id || '').trim();
        return c && b ? { creator: c, bounty_id: b } : null;
      })
      .filter(Boolean);

    if (pairs.length === 0) {
      return NextResponse.json({ ok: true, items: [] });
    }

    // Build WHERE clause with OR conditions for each pair
    // This is more efficient than fetching 500 rows and filtering in memory
    const conditions = pairs
      .map((p, i) => `(creator = $${i * 2 + 1} AND bounty_id = $${i * 2 + 2})`)
      .join(' OR ');

    const values = pairs.flatMap((p: any) => [p.creator, p.bounty_id]);

    const { rows } = await query(
      `SELECT creator, bounty_id, title, description
       FROM bounty_metadata
       WHERE ${conditions}
       ORDER BY created_at DESC`,
      values
    );

    return NextResponse.json({ ok: true, items: rows });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: 'db_error', message: e?.message || String(e), items: [] },
      { status: 500 }
    );
  }
}

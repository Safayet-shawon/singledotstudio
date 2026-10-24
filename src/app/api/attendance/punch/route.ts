import crypto from 'node:crypto';
import { q1 } from '@/server/db';
import { json, rateLimited, readJson, str } from '@/lib/guard';

export const runtime = 'nodejs';

/**
 * Fingerprint device or bridge script: one request per scan, `Authorization: Bearer <ATTENDANCE_DEVICE_KEY>`, body `{ "fid": "12", "at": "2026-10-24T09:02:00+06:00" }`.
 * The first scan of a day is the check-in, later scans move the check-out forward. Disabled until the key is set (at least 24 characters).
 */
export async function POST(req: Request) {
  const key = process.env.ATTENDANCE_DEVICE_KEY;
  if (!key || key.length < 24) return json({ error: 'Not enabled.' }, 503);
  if (await rateLimited(req, 'punch', 300, 60_000)) return json({ error: 'Too many requests.' }, 429);
  const given = Buffer.from((req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, ''));
  const want = Buffer.from(key);
  if (given.length !== want.length || !crypto.timingSafeEqual(given, want)) return json({ error: 'Unauthorised.' }, 401);

  const b = await readJson(req);
  const fid = b ? str(b.fid, 30) : '';
  if (!/^[A-Za-z0-9_-]{1,30}$/.test(fid)) return json({ error: 'Invalid fingerprint ID.' }, 400);
  let at = new Date();
  if (b && typeof b.at === 'string') {
    const t = new Date(b.at);
    // Accept a device clock that is a little behind or ahead; refuse anything older than two days or in the future.
    if (!Number.isNaN(t.getTime()) && t.getTime() <= Date.now() + 5 * 60_000 && t.getTime() >= Date.now() - 2 * 86_400_000) at = t;
  }
  const iso = at.toISOString();
  const row = await q1<{ action: string }>(
    `WITH u AS (SELECT id FROM users WHERE fingerprint_id = $1 AND status = 'active'),
          d AS (SELECT ($2::timestamptz AT TIME ZONE 'Asia/Dhaka')::date AS day),
          ins AS (
            INSERT INTO attendance (user_id, work_date, check_in, source)
            SELECT u.id, d.day, $2::timestamptz, 'fingerprint' FROM u, d
            ON CONFLICT (user_id, work_date) DO NOTHING RETURNING 'check_in' AS action),
          upd AS (
            UPDATE attendance a SET check_in = COALESCE(a.check_in, $2::timestamptz),
              check_out = CASE WHEN a.check_in IS NOT NULL AND $2::timestamptz > a.check_in + interval '1 minute' THEN GREATEST(COALESCE(a.check_out, $2::timestamptz), $2::timestamptz) ELSE a.check_out END
            FROM u, d WHERE a.user_id = u.id AND a.work_date = d.day AND NOT EXISTS (SELECT 1 FROM ins) RETURNING CASE WHEN a.check_out IS NOT NULL THEN 'check_out' ELSE 'ignored' END AS action)
     SELECT action FROM ins UNION ALL SELECT action FROM upd`, [fid, iso]);
  if (!row) return json({ error: 'Unknown fingerprint ID.' }, 404);
  return json({ ok: true, action: row.action });
}

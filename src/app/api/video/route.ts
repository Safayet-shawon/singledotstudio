import crypto from 'node:crypto';
import { MuapiError, status, submit, validateRequest, type GenerateRequest } from '@/lib/muapi';
import { buildPrompt, videoPrompts } from '@/config/video-prompts';
import { json, rateLimited, readJson } from '@/lib/guard';

export const runtime = 'nodejs';

// Admin-only video generation API. Disabled unless VIDEO_ADMIN_TOKEN is set. It never downloads files
// (Vercel's filesystem is read-only); use scripts/generate-video.ts locally to save finished videos.
function authorised(req: Request) {
  const token = process.env.VIDEO_ADMIN_TOKEN;
  if (!token) return false;
  const given = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
  const a = crypto.createHash('sha256').update(given).digest();
  const b = crypto.createHash('sha256').update(token).digest();
  return crypto.timingSafeEqual(a, b);
}

function fail(e: unknown) {
  if (e instanceof MuapiError) return json({ error: e.message, code: e.code }, e.code === 'rate_limited' ? 429 : e.code === 'no_key' ? 503 : 502);
  return json({ error: (e as Error).message }, 400);
}

export async function POST(req: Request) {
  if (!process.env.VIDEO_ADMIN_TOKEN) return json({ error: 'Not found' }, 404);
  if (!authorised(req)) return json({ error: 'Unauthorised' }, 401);
  if (rateLimited(req, 'video', 5, 60 * 60_000)) return json({ error: 'Hourly generation limit reached.' }, 429);
  const b = await readJson(req);
  if (!b) return json({ error: 'Invalid request.' }, 400);
  const slot = typeof b.slot === 'string' ? b.slot : '';
  const prompt = typeof b.prompt === 'string' ? b.prompt : slot in videoPrompts ? buildPrompt(slot)! : '';
  const r: GenerateRequest = { model: String(b.model ?? 'seedance-pro-t2v'), prompt, aspectRatio: b.aspectRatio as string | undefined, duration: b.duration as number | undefined, resolution: b.resolution as string | undefined };
  const v = validateRequest(r);
  if (!v.ok) return json({ error: v.error }, 400);
  try {
    return json(await submit(r));
  } catch (e) {
    return fail(e);
  }
}

export async function GET(req: Request) {
  if (!process.env.VIDEO_ADMIN_TOKEN) return json({ error: 'Not found' }, 404);
  if (!authorised(req)) return json({ error: 'Unauthorised' }, 401);
  const id = new URL(req.url).searchParams.get('id') ?? '';
  try {
    return json(await status(id));
  } catch (e) {
    return fail(e);
  }
}

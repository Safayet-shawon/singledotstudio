// Server-side Muapi.ai client. No imports so it also runs from scripts/generate-video.ts.
// Pattern taken from the local open-higgsfield-ai project:
//   POST https://api.muapi.ai/api/v1/{endpoint}              header x-api-key
//   GET  https://api.muapi.ai/api/v1/predictions/{id}/result  -> { status, outputs: [url] }
// The key is read from MUAPI_API_KEY on the server only. Never pass it to client code.

export const MUAPI_BASE = 'https://api.muapi.ai';

export interface ModelRule {
  endpoint: string;
  kind: 'video' | 'image';
  aspectRatios: string[];
  durations?: number[];
  resolutions?: string[];
  note: string;
}

// Strict allowlist. Constraints copied from open-higgsfield-ai/src/lib/models.js; "durations" for Seedance
// is a conservative subset because the catalog types it as a free integer.
export const MODELS: Record<string, ModelRule> = {
  'seedance-pro-t2v': { endpoint: 'seedance-pro-t2v', kind: 'video', aspectRatios: ['16:9', '9:16', '1:1', '4:3', '3:4', '21:9'], durations: [5, 10], resolutions: ['480p', '720p', '1080p'], note: 'Default: landscape cinematic text-to-video' },
  'veo3.1-fast-text-to-video': { endpoint: 'veo3.1-fast-text-to-video', kind: 'video', aspectRatios: ['16:9', '9:16'], durations: [8], resolutions: ['1080p'], note: 'Higher fidelity, fixed 8s' },
  'flux-schnell': { endpoint: 'flux-schnell-image', kind: 'image', aspectRatios: ['16:9', '1:1', '4:3', '3:4', '9:16'], note: 'Fast stills for posters' },
};

export interface GenerateRequest { model: string; prompt: string; aspectRatio?: string; duration?: number; resolution?: string }

export function validateRequest(r: GenerateRequest): { ok: true; endpoint: string; payload: Record<string, unknown> } | { ok: false; error: string } {
  const rule = MODELS[r.model];
  if (!rule) return { ok: false, error: `Model not allowed. Allowed: ${Object.keys(MODELS).join(', ')}` };
  const prompt = (r.prompt ?? '').trim();
  if (prompt.length < 20 || prompt.length > 2000) return { ok: false, error: 'Prompt must be 20 to 2000 characters.' };
  const aspect = r.aspectRatio ?? '16:9';
  if (!rule.aspectRatios.includes(aspect)) return { ok: false, error: `Aspect ratio must be one of ${rule.aspectRatios.join(', ')}` };
  const payload: Record<string, unknown> = { prompt, aspect_ratio: aspect };
  if (rule.kind === 'video') {
    const duration = r.duration ?? rule.durations![0];
    if (!rule.durations!.includes(duration)) return { ok: false, error: `Duration must be one of ${rule.durations!.join(', ')}` };
    const resolution = r.resolution ?? rule.resolutions![rule.resolutions!.length - 1];
    if (!rule.resolutions!.includes(resolution)) return { ok: false, error: `Resolution must be one of ${rule.resolutions!.join(', ')}` };
    payload.duration = duration;
    payload.resolution = resolution;
  }
  return { ok: true, endpoint: rule.endpoint, payload };
}

function key() {
  const k = process.env.MUAPI_API_KEY;
  if (!k) throw new MuapiError('MUAPI_API_KEY is not set on the server.', 'no_key');
  return k;
}

export type MuapiCode = 'no_key' | 'auth' | 'rate_limited' | 'provider' | 'timeout' | 'failed';
export class MuapiError extends Error {
  code: MuapiCode;
  status?: number;
  constructor(message: string, code: MuapiCode, status?: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

async function call(path: string, init: RequestInit & { retries?: number } = {}) {
  const retries = init.retries ?? 2;
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(`${MUAPI_BASE}${path}`, { ...init, headers: { 'Content-Type': 'application/json', 'x-api-key': key(), ...(init.headers ?? {}) }, signal: AbortSignal.timeout(30_000) });
    if (res.ok) return res.json() as Promise<Record<string, any>>;
    if (res.status === 401 || res.status === 403) throw new MuapiError('Muapi rejected the API key.', 'auth', res.status);
    const retryable = res.status === 429 || res.status >= 500;
    if (retryable && attempt < retries) {
      await new Promise((r) => setTimeout(r, 2000 * 2 ** attempt));
      continue;
    }
    // Do not echo the provider body: it can contain account details.
    throw new MuapiError(res.status === 429 ? 'Muapi rate limit reached.' : `Muapi request failed (${res.status}).`, res.status === 429 ? 'rate_limited' : 'provider', res.status);
  }
}

export async function submit(req: GenerateRequest): Promise<{ requestId: string }> {
  const v = validateRequest(req);
  if (!v.ok) throw new Error(v.error);
  const data = await call(`/api/v1/${v.endpoint}`, { method: 'POST', body: JSON.stringify(v.payload), retries: 0 }); // never auto-retry a paid submit
  const requestId = data.request_id ?? data.id;
  if (!requestId) throw new MuapiError('Muapi did not return a request id.', 'provider');
  return { requestId: String(requestId) };
}

export async function status(requestId: string): Promise<{ state: 'pending' | 'completed' | 'failed'; url?: string }> {
  if (!/^[\w-]{8,80}$/.test(requestId)) throw new Error('Invalid request id.');
  const d = await call(`/api/v1/predictions/${requestId}/result`, { method: 'GET' });
  const s = String(d.status ?? '').toLowerCase();
  if (['completed', 'succeeded', 'success'].includes(s)) {
    const url = d.outputs?.[0] ?? d.url ?? d.output?.url;
    if (!url) throw new MuapiError('Generation finished but no output URL was returned.', 'provider');
    return { state: 'completed', url: String(url) };
  }
  if (['failed', 'error'].includes(s)) return { state: 'failed' };
  return { state: 'pending' };
}

export async function waitForResult(requestId: string, { timeoutMs = 10 * 60_000, intervalMs = 5000, onTick }: { timeoutMs?: number; intervalMs?: number; onTick?: (n: number) => void } = {}) {
  const start = Date.now();
  for (let n = 1; Date.now() - start < timeoutMs; n++) {
    await new Promise((r) => setTimeout(r, intervalMs));
    const s = await status(requestId);
    onTick?.(n);
    if (s.state === 'completed') return s.url!;
    if (s.state === 'failed') throw new MuapiError('Generation failed at the provider.', 'failed');
  }
  throw new MuapiError('Timed out waiting for generation.', 'timeout');
}

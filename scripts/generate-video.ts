// Generate a site video (and optional poster) through Muapi and store it in public/media.
//   node scripts/generate-video.ts --slot home --dry-run
//   node scripts/generate-video.ts --slot home                (needs MUAPI_API_KEY in .env.local; CREDITS ARE SPENT)
//   node scripts/generate-video.ts --slot home --poster       (also generate a poster still)
//   node scripts/generate-video.ts --slot home --resume <request_id>   (re-poll a previous submission)
// Slots: home kitchen bedroom bathroom living-dining office about
import fs from 'node:fs';
import path from 'node:path';
import { buildPrompt, videoPrompts } from '../src/config/video-prompts.ts';
import { MODELS, submit, validateRequest, waitForResult } from '../src/lib/muapi.ts';

for (const f of ['.env.local', '.env']) { try { process.loadEnvFile(f); } catch { /* optional */ } }

const args = process.argv.slice(2);
const flag = (n: string) => args.includes(`--${n}`);
const opt = (n: string) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : undefined; };

const slot = opt('slot');
if (!slot || !videoPrompts[slot]) {
  console.error(`Usage: node scripts/generate-video.ts --slot <${Object.keys(videoPrompts).join('|')}> [--model id] [--duration n] [--resolution r] [--poster] [--dry-run] [--resume id]`);
  process.exit(1);
}
const model = opt('model') ?? 'seedance-pro-t2v';
const prompt = buildPrompt(slot)!;
const req = { model, prompt, aspectRatio: '16:9', duration: opt('duration') ? Number(opt('duration')) : undefined, resolution: opt('resolution') ?? '1080p' };
const v = validateRequest(req);
if (!v.ok) { console.error(v.error); process.exit(1); }

console.log(`Model: ${model} (${MODELS[model].note})\nPayload: ${JSON.stringify(v.payload, null, 2)}`);
if (flag('dry-run')) { console.log('\nDry run: nothing was sent.'); process.exit(0); }
if (!process.env.MUAPI_API_KEY) { console.error('\nMUAPI_API_KEY is not set (put it in .env.local). Nothing was sent.'); process.exit(2); }

async function download(url: string, dest: string) {
  const res = await fetch(url, { signal: AbortSignal.timeout(120_000) });
  if (!res.ok) throw new Error(`Download failed (${res.status})`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 10_000) throw new Error('Downloaded file is suspiciously small; refusing to save it.');
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, buf);
  console.log(`Saved ${path.relative(process.cwd(), dest)} (${(buf.length / 1e6).toFixed(1)} MB)`);
}

try {
  const resume = opt('resume');
  const requestId = resume ?? (await submit(req)).requestId;
  console.log(`Request id: ${requestId} (use --resume ${requestId} if this process stops)`);
  const url = await waitForResult(requestId, { onTick: (n) => process.stdout.write(`\rpolling ${n}`) });
  console.log();
  await download(url, path.join('public', 'media', 'video', `${slot}.mp4`));

  if (flag('poster')) {
    const posterReq = { model: 'flux-schnell', prompt: `${videoPrompts[slot].scene}. Photorealistic architectural photograph, natural daylight, no people, no text.`, aspectRatio: '16:9' };
    const { requestId: pid } = await submit(posterReq);
    const purl = await waitForResult(pid, { intervalMs: 3000, onTick: (n) => process.stdout.write(`\rposter polling ${n}`) });
    console.log();
    await download(purl, path.join('public', 'media', 'img', `${slot}-poster.jpg`));
  }
  console.log('\nDone. Verify the file plays before publishing; compress if it is large (see README).');
} catch (e) {
  console.error(`\nFailed: ${(e as Error).message}`);
  process.exit(3);
}

'use server';
import crypto from 'node:crypto';
import { revalidatePath, revalidateTag } from 'next/cache';
import { put } from '@vercel/blob';
import { q, q1 } from '../db';
import { assertCan, canAny, Forbidden, type User } from '../auth';
import { audit, notify } from '../audit';
import { FONTS, getDraftContent, type SiteContent } from '../cms';
import { MAX_BYTES } from '../files';
import { bad, fail, me, s, UUID } from '../util';
import type { R } from '@/components/admin/Forms';
import type { Project } from '@/config/site';

const EDIT_ANY = ['cms.edit_text', 'cms.upload_images', 'cms.replace_images', 'cms.portfolio', 'cms.fonts', 'cms.design'];

async function patch(u: User, change: (c: SiteContent) => void, action: string, detail?: Record<string, unknown>) {
  const { draft } = await getDraftContent();
  const next = structuredClone(draft);
  change(next);
  await q(`INSERT INTO cms (key, draft) VALUES ('site', $1) ON CONFLICT (key) DO UPDATE SET draft = EXCLUDED.draft, updated_at = now()`, [JSON.stringify(next)]);
  await audit(u, action, 'cms', 'site', detail);
  revalidatePath('/admin/website');
}
const clip = (v: string, n: number) => v.slice(0, n);

export async function saveTextAction(_: R, fd: FormData): Promise<R> {
  try {
    const u = await me();
    assertCan(u, 'cms.edit_text');
    const num = (k: string) => { const v = s(fd, k, 9); if (v === '') return null; const n = Number(v); return Number.isFinite(n) && n >= 0 ? Math.round(n) : null; };
    const svc: Record<string, string> = {};
    for (const [k, v] of fd.entries()) if (k.startsWith('svc_')) svc[k.slice(4)] = clip(String(v).trim(), 400);
    await patch(u, (c) => {
      c.hero.quote = clip(s(fd, 'hero_quote', 160), 160) || c.hero.quote;
      c.hero.budgetQuote = clip(s(fd, 'hero_budget', 200), 200) || c.hero.budgetQuote;
      c.contact = { phone: s(fd, 'phone', 40), email: s(fd, 'email', 120), address: s(fd, 'address', 240), hours: s(fd, 'hours', 120) };
      c.founder = { name: s(fd, 'founder_name', 80) || c.founder.name, title: s(fd, 'founder_title', 120), quote: s(fd, 'founder_quote', 500) || c.founder.quote };
      c.stats = { completed: num('stat_completed'), running: num('stat_running'), cities: num('stat_cities') };
      c.seo = { title: s(fd, 'seo_title', 90) || c.seo.title, description: s(fd, 'seo_desc', 200) || c.seo.description };
      c.footer = { blurb: s(fd, 'footer_blurb', 200) || c.footer.blurb };
      for (const [slug, intro] of Object.entries(svc)) if (c.services[slug] && intro) c.services[slug] = { intro };
    }, 'cms.text_saved');
    return { ok: true, message: 'Saved to the draft. Publish to make it live.' };
  } catch (e) { return fail(e); }
}

export async function saveTypographyAction(_: R, fd: FormData): Promise<R> {
  try {
    const u = await me();
    assertCan(u, 'cms.fonts');
    const heading = s(fd, 'heading', 20), body = s(fd, 'body', 20);
    if (!FONTS.heading.some((f) => f.key === heading) || !FONTS.body.some((f) => f.key === body)) throw bad('Choose fonts from the approved list.');
    const hw = Number(s(fd, 'hw', 4)), bw = Number(s(fd, 'bw', 4));
    if (![400, 500, 600].includes(hw) || ![300, 400, 500].includes(bw)) throw bad('Choose a supported weight.');
    await patch(u, (c) => { c.typography = { heading: heading as SiteContent['typography']['heading'], body: body as SiteContent['typography']['body'], headingWeight: hw as 400 | 500 | 600, bodyWeight: bw as 300 | 400 | 500 }; }, 'cms.typography_saved', { heading, body, hw, bw });
    return { ok: true, message: 'Typography saved to the draft.' };
  } catch (e) { return fail(e); }
}

export async function saveSlidesAction(_: R, fd: FormData): Promise<R> {
  try {
    const u = await me();
    assertCan(u, 'cms.design');
    let slides: unknown; try { slides = JSON.parse(s(fd, 'slides', 2000)); } catch { throw bad('Invalid slide list.'); }
    if (!Array.isArray(slides) || slides.length < 1 || slides.length > 12 || !slides.every((x) => typeof x === 'string' && /^[a-z0-9-]{2,60}$/.test(x))) throw bad('Choose between 1 and 12 slides.');
    await patch(u, (c) => { c.hero.slides = slides as string[]; }, 'cms.slides_saved');
    return { ok: true, message: 'Hero slides saved to the draft.' };
  } catch (e) { return fail(e); }
}

const slug = (v: string) => v.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
export async function savePortfolioAction(_: R, fd: FormData): Promise<R> {
  try {
    const u = await me();
    assertCan(u, 'cms.portfolio');
    let list: unknown; try { list = JSON.parse(s(fd, 'items', 60_000)); } catch { throw bad('Invalid portfolio data.'); }
    if (!Array.isArray(list) || list.length > 60) throw bad('Too many portfolio entries.');
    const cats = ['residential', 'kitchen', 'bedroom', 'bathroom', 'living-dining', 'office'];
    const svcs = ['kitchen', 'bedroom', 'bathroom', 'living-dining', 'office'];
    const seen = new Set<string>();
    const items: Project[] = list.map((raw: Record<string, unknown>) => {
      const title = String(raw.title ?? '').trim().slice(0, 100);
      if (title.length < 2) throw bad('Every entry needs a title.');
      const sl = slug(String(raw.slug || title));
      if (!sl || seen.has(sl)) throw bad(`Two entries share the web address "${sl}". Titles must be different.`);
      seen.add(sl);
      const lines = (v: unknown) => (Array.isArray(v) ? v : String(v ?? '').split('\n')).map((x) => String(x).trim().slice(0, 120)).filter(Boolean).slice(0, 12);
      return {
        slug: sl, title, category: (cats.includes(String(raw.category)) ? raw.category : 'residential') as Project['category'], service: (svcs.includes(String(raw.service)) ? raw.service : 'living-dining') as Project['service'],
        status: raw.status === 'completed' ? 'completed' : 'concept', location: String(raw.location ?? '').trim().slice(0, 80) || null,
        image: /^[a-z0-9-]{2,60}$/.test(String(raw.image)) ? String(raw.image) : `portfolio-${sl}`, narrative: String(raw.narrative ?? '').trim().slice(0, 700), materials: lines(raw.materials), scope: lines(raw.scope),
      };
    });
    await patch(u, (c) => { c.portfolio = items; }, 'cms.portfolio_saved', { entries: items.length });
    return { ok: true, message: 'Portfolio saved to the draft.' };
  } catch (e) { return fail(e); }
}

function sniff(buf: Buffer): 'jpg' | 'png' | 'webp' | 'gif' | null {
  if (buf.length > 12 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg';
  if (buf.length > 12 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (buf.length > 12 && buf.subarray(0, 4).toString() === 'RIFF' && buf.subarray(8, 12).toString() === 'WEBP') return 'webp';
  if (buf.length > 12 && buf.subarray(0, 4).toString() === 'GIF8') return 'gif';
  return null;
}
const MIME = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif' } as const;

/** Validates by file signature (not just the name), limits size, and stores privately; the public site serves it through /cms-media. */
export async function uploadMediaAction(_: R, fd: FormData): Promise<R> {
  try {
    const u = await me();
    assertCan(u, 'cms.upload_images');
    const file = fd.get('file') as File | null;
    if (!file || typeof file === 'string' || file.size === 0) throw bad('Choose an image to upload.');
    if (file.size > MAX_BYTES) throw bad('That image is too large (4 MB maximum).');
    const buf = Buffer.from(await file.arrayBuffer());
    const kind = sniff(buf);
    if (!kind) throw bad('Only JPG, PNG, WebP and GIF images are allowed.');
    const path = `private/media/${crypto.randomUUID()}.${kind}`;
    await put(path, buf, { access: 'private', addRandomSuffix: false, contentType: MIME[kind] });
    const row = await q1<{ id: string }>(`INSERT INTO media (name, alt, caption, mime, size, blob_path, uploaded_by) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
      [file.name.replace(/[^\w.\- ]+/g, '_').slice(0, 100), s(fd, 'alt', 200) || null, s(fd, 'caption', 200) || null, MIME[kind], file.size, path, u.id]);
    await audit(u, 'cms.media_uploaded', 'media', row!.id, { name: file.name });
    revalidatePath('/admin/website');
    return { ok: true, message: 'Image added to the library.' };
  } catch (e) { return fail(e); }
}

export async function updateMediaAction(_: R, fd: FormData): Promise<R> {
  try {
    const u = await me();
    if (!canAny(u, ['cms.upload_images', 'cms.edit_text'])) throw new Forbidden();
    const id = s(fd, 'id', 40);
    if (!UUID.test(id)) throw bad('Unknown image.');
    await q(`UPDATE media SET alt = $2, caption = $3 WHERE id = $1`, [id, s(fd, 'alt', 200) || null, s(fd, 'caption', 200) || null]);
    revalidatePath('/admin/website');
    return { ok: true, message: 'Saved.' };
  } catch (e) { return fail(e); }
}

export async function setSlotImageAction(slot: string, mediaId: string | null): Promise<R> {
  try {
    const u = await me();
    assertCan(u, 'cms.replace_images');
    if (!/^[a-z0-9-]{2,60}$/.test(slot)) throw bad('Unknown image slot.');
    if (mediaId) {
      if (!UUID.test(mediaId) || !(await q1(`SELECT 1 AS x FROM media WHERE id = $1`, [mediaId]))) throw bad('Unknown image.');
    }
    await patch(u, (c) => { if (mediaId) c.images[slot] = mediaId; else delete c.images[slot]; }, 'cms.image_set', { slot, mediaId });
    return { ok: true };
  } catch (e) { return fail(e); }
}

export async function publishAction(note: string): Promise<R> {
  try {
    const u = await me();
    assertCan(u, 'cms.publish');
    const row = await q1<{ draft: unknown; published: unknown }>(`SELECT draft, published FROM cms WHERE key = 'site'`);
    const { draft } = await getDraftContent();
    await q(`INSERT INTO cms (key, draft, published) VALUES ('site', $1, $1) ON CONFLICT (key) DO UPDATE SET published = EXCLUDED.published, draft = EXCLUDED.draft, updated_at = now()`, [JSON.stringify(draft)]);
    await q(`INSERT INTO cms_versions (snapshot, published_by, note) VALUES ($1,$2,$3)`, [JSON.stringify(draft), u.id, clip(note.trim(), 200) || null]);
    await audit(u, 'cms.published', 'cms', 'site', { note: clip(note.trim(), 200), hadPublished: Boolean(row?.published) });
    revalidateTag('cms', 'max');
    revalidatePath('/', 'layout');
    const editors = await q<{ id: string }>(`SELECT id FROM users WHERE status = 'active' AND is_owner`);
    await notify(editors.map((x) => x.id).filter((x) => x !== u.id), 'cms', 'Website changes were published', `By ${u.name}`, '/admin/website?tab=history');
    return { ok: true };
  } catch (e) { return fail(e); }
}

export async function discardAction(): Promise<R> {
  try {
    const u = await me();
    if (!canAny(u, [...EDIT_ANY, 'cms.publish'])) throw new Forbidden();
    await q(`UPDATE cms SET draft = published, updated_at = now() WHERE key = 'site'`);
    await audit(u, 'cms.draft_discarded', 'cms', 'site');
    revalidatePath('/admin/website');
    return { ok: true };
  } catch (e) { return fail(e); }
}

/** Puts an old published version into the draft. It only goes live when someone publishes it. */
export async function restoreVersionAction(id: number): Promise<R> {
  try {
    const u = await me();
    assertCan(u, 'cms.publish');
    const v = await q1<{ snapshot: unknown }>(`SELECT snapshot FROM cms_versions WHERE id = $1`, [id]);
    if (!v) throw bad('Unknown version.');
    await q(`INSERT INTO cms (key, draft) VALUES ('site', $1) ON CONFLICT (key) DO UPDATE SET draft = EXCLUDED.draft, updated_at = now()`, [JSON.stringify(v.snapshot)]);
    await audit(u, 'cms.version_restored_to_draft', 'cms', 'site', { versionId: id });
    revalidatePath('/admin/website');
    return { ok: true };
  } catch (e) { return fail(e); }
}


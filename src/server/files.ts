import crypto from 'node:crypto';
import { put, get, del } from '@vercel/blob';
import { q, q1 } from './db';
import type { User } from './auth';

export const MAX_BYTES = 4 * 1024 * 1024; // Vercel request bodies are capped at ~4.5 MB
const ALLOWED_EXT = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif', 'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv', 'zip', 'dwg', 'dxf', 'skp']);
export const IMAGE_EXT = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif']);
const MIME: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif', pdf: 'application/pdf', txt: 'text/plain', csv: 'text/csv', zip: 'application/zip' };

const ext = (name: string) => (name.split('.').pop() ?? '').toLowerCase();
const clean = (name: string) => name.replace(/[^\w.\- ]+/g, '_').slice(0, 100) || 'file';

export function validateUpload(file: File | null, opts: { imagesOnly?: boolean } = {}): string | null {
  if (!file || typeof file === 'string' || file.size === 0) return 'Choose a file to upload.';
  if (file.size > MAX_BYTES) return 'That file is too large (4 MB maximum).';
  const e = ext(file.name);
  if (!ALLOWED_EXT.has(e)) return 'That file type is not allowed.';
  if (opts.imagesOnly && !IMAGE_EXT.has(e)) return 'Please upload a JPG, PNG, WebP or GIF image.';
  return null;
}

/** Stores a file privately in Vercel Blob and records it. Files are only served through authorised routes. */
export async function saveFile(file: File, kind: string, refId: string | null, user: User): Promise<string> {
  const e = ext(file.name);
  const path = `private/${kind}/${crypto.randomUUID()}.${e}`;
  const mime = MIME[e] ?? 'application/octet-stream';
  await put(path, Buffer.from(await file.arrayBuffer()), { access: 'private', addRandomSuffix: false, contentType: mime });
  const r = await q1<{ id: string }>(`INSERT INTO files (kind, ref_id, name, mime, size, blob_path, uploaded_by) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`, [kind, refId, clean(file.name), mime, file.size, path, user.id]);
  return r!.id;
}

export async function streamBlob(path: string) {
  const res = await get(path, { access: 'private' });
  return res && res.statusCode === 200 ? res : null;
}

export async function removeFile(id: string) {
  const f = await q1<{ blob_path: string }>(`DELETE FROM files WHERE id = $1 RETURNING blob_path`, [id]);
  if (f) await del(f.blob_path).catch(() => undefined);
}

export const filesFor = (kind: string, refId: string) => q<{ id: string; name: string; size: number; created_at: string; uploader: string | null }>(
  `SELECT f.id, f.name, f.size, f.created_at, u.name AS uploader FROM files f LEFT JOIN users u ON u.id = f.uploaded_by WHERE f.kind = $1 AND f.ref_id = $2 ORDER BY f.created_at DESC`, [kind, refId]);

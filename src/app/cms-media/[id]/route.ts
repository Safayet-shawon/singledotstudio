import { q1 } from '@/server/db';
import { streamBlob } from '@/server/files';

export const runtime = 'nodejs';

/** Public image delivery for CMS media (website images are public by nature). Only rows in the media table can be served. */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response('Not found', { status: 404 });
  const m = await q1<{ mime: string; blob_path: string }>(`SELECT mime, blob_path FROM media WHERE id = $1`, [id]);
  if (!m) return new Response('Not found', { status: 404 });
  const blob = await streamBlob(m.blob_path);
  if (!blob) return new Response('Not found', { status: 404 });
  return new Response(blob.stream, { headers: { 'Content-Type': m.mime, 'Cache-Control': 'public, max-age=31536000, immutable', 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'none'; sandbox" } });
}

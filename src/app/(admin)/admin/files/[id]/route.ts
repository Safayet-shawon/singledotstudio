import { getUser, can } from '@/server/auth';
import { canViewDoc, canViewProject, canViewTask } from '@/server/access';
import { q1 } from '@/server/db';
import { streamBlob } from '@/server/files';

export const runtime = 'nodejs';

/** Every private file is served through this authorised route. There are no public or guessable file URLs. */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const u = await getUser();
  if (!u || !/^[0-9a-f-]{36}$/i.test(id)) return new Response('Not found', { status: 404 });
  const f = await q1<{ kind: string; ref_id: string | null; name: string; mime: string; blob_path: string }>(`SELECT kind, ref_id, name, mime, blob_path FROM files WHERE id = $1`, [id]);
  if (!f || !f.ref_id) return new Response('Not found', { status: 404 });
  let ok = false;
  if (f.kind === 'task') ok = await canViewTask(u, f.ref_id);
  else if (f.kind === 'project') ok = (await canViewProject(u, f.ref_id)) && can(u, 'project.view_files');
  else if (f.kind === 'document') ok = (await canViewDoc(u, f.ref_id)) && (can(u, 'client.download_docs') || can(u, 'fin.view') || can(u, 'fin.view_all_documents'));
  if (!ok) return new Response('Not found', { status: 404 }); // 404, not 403: do not reveal that the file exists
  const blob = await streamBlob(f.blob_path);
  if (!blob) return new Response('Not found', { status: 404 });
  return new Response(blob.stream, { headers: { 'Content-Type': f.mime, 'Content-Disposition': `attachment; filename="${f.name.replace(/"/g, '')}"`, 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' } });
}

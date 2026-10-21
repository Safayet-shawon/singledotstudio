import { getUser, can } from '@/server/auth';
import { canViewDoc } from '@/server/access';
import { q1, num } from '@/server/db';
import { buildDocumentPdf } from '@/server/doc-pdf';
import { getCompany } from '@/server/settings';
import { audit } from '@/server/audit';
import type { DocData } from '@/server/doc-math';

export const runtime = 'nodejs';

/** PDFs are rendered on demand from the stored version data after an authorisation check. There is no public file URL. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const u = await getUser();
  if (!u || !/^[0-9a-f-]{36}$/i.test(id) || !(await canViewDoc(u, id))) return new Response('Not found', { status: 404 });
  if (!(can(u, 'client.download_docs') || can(u, 'fin.view') || can(u, 'fin.view_all_documents') || can(u, 'fin.quote_create') || can(u, 'fin.invoice_create') || u.isOwner)) return new Response('Not found', { status: 404 });
  const d = await q1<{ number: string; type: string; status: string; current_version: number; client_id: string | null; project_id: string | null }>(`SELECT number, type, status, current_version, client_id, project_id FROM documents WHERE id = $1`, [id]);
  if (!d) return new Response('Not found', { status: 404 });
  const want = Number(new URL(req.url).searchParams.get('v')) || d.current_version;
  const v = await q1<{ data: DocData }>(`SELECT data FROM document_versions WHERE document_id = $1 AND version = $2`, [id, want]);
  if (!v) return new Response('Not found', { status: 404 });
  const [client, project, paid] = await Promise.all([
    d.client_id ? q1<{ name: string; company: string | null; phone: string | null; email: string | null; address: string | null; taxId: string | null }>(`SELECT name, company, phone, email, address, tax_id AS "taxId" FROM clients WHERE id = $1`, [d.client_id]) : null,
    d.project_id ? q1<{ name: string; code: string; location: string | null }>(`SELECT name, code, location FROM projects WHERE id = $1`, [d.project_id]) : null,
    q1<{ n: string }>(`SELECT coalesce(sum(amount),0)::text AS n FROM payments WHERE document_id = $1`, [id]),
  ]);
  const pdf = await buildDocumentPdf({ number: d.number, type: d.type, version: want, status: d.status, data: v.data, company: await getCompany(), client, project, paid: num(paid?.n) });
  await audit(u, 'document.downloaded', 'document', id, { version: want });
  return new Response(new Uint8Array(pdf), { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="${d.number}${want > 1 ? `-v${want}` : ''}.pdf"`, 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' } });
}

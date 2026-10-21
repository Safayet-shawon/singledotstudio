import { notFound, redirect } from 'next/navigation';
import { requireUser } from '@/server/auth';
import { q1 } from '@/server/db';
import { canViewDoc } from '@/server/access';
import { docAllowed } from '@/server/doc-perms';
import type { DocData } from '@/server/doc-math';
import { saveDocumentAction } from '@/server/actions/documents';
import { DocBuilder } from '@/components/admin/DocBuilder';
import { Card } from '@/components/admin/Ui';

export const metadata = { title: 'Edit document' };

export default async function EditDocument({ params }: { params: Promise<{ id: string }> }) {
  const u = await requireUser();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id) || !(await canViewDoc(u, id))) notFound();
  const d = await q1<{ number: string; type: string; status: string; issued: boolean; created_by: string | null; current_version: number; data: DocData }>(
    `SELECT d.number, d.type, d.status, d.issued, d.created_by, d.current_version, v.data FROM documents d JOIN document_versions v ON v.document_id = d.id AND v.version = d.current_version WHERE d.id = $1`, [id]);
  if (!d) notFound();
  const ok = d.status !== 'cancelled' && (docAllowed(u, d.type, 'edit') || (d.created_by === u.id && !d.issued && docAllowed(u, d.type, 'create')));
  if (!ok) redirect(`/admin/documents/${id}`);
  return (
    <div style={{ maxWidth: 1040 }}>
      <Card title={`${d.issued ? 'Revise' : 'Edit'} ${d.number}`}>
        {d.issued && <p className="ad-msg warn" style={{ marginBottom: 14 }}>This document was already issued. Your changes will be saved as revision {d.current_version + 1}; the current version is kept in the history and the revision needs approval again.</p>}
        <DocBuilder action={saveDocumentAction} initial={d.data} docId={id} needsNote={d.issued} submit={d.issued ? 'Save as revision' : 'Save changes'} />
      </Card>
    </div>
  );
}

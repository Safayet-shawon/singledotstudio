import { redirect } from 'next/navigation';
import { requireUser } from '@/server/auth';
import { q } from '@/server/db';
import { clientScope, projectScope } from '@/server/access';
import { DOC_TYPES, emptyDoc } from '@/server/doc-math';
import { docAllowed } from '@/server/doc-perms';
import { getCompany } from '@/server/settings';
import { createDocumentAction } from '@/server/actions/documents';
import { DocBuilder } from '@/components/admin/DocBuilder';
import { Card } from '@/components/admin/Ui';

export const metadata = { title: 'New document' };

export default async function NewDocument({ searchParams }: { searchParams: Promise<{ client?: string; project?: string; type?: string }> }) {
  const u = await requireUser();
  const types = DOC_TYPES.filter((t) => docAllowed(u, t.key, 'create')).map((t) => t.key);
  if (types.length === 0) redirect('/admin?denied=1');
  const sp = await searchParams;
  const cp: unknown[] = [], pp: unknown[] = [];
  const [clients, projects, co] = await Promise.all([
    q<{ id: string; name: string }>(`SELECT c.id, c.name FROM clients c WHERE ${clientScope(u, 'c', cp)} ORDER BY c.name LIMIT 300`, cp),
    q<{ id: string; name: string; client_id: string | null }>(`SELECT p.id, p.name, p.client_id FROM projects p WHERE ${projectScope(u, 'p', pp)} ORDER BY p.name LIMIT 300`, pp),
    getCompany(),
  ]);
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' });
  const init = { ...emptyDoc(today), taxLabel: co.taxLabel, taxPercent: co.taxPercent, terms: co.defaultTerms, paymentTerms: co.defaultPaymentTerms };
  return (
    <div style={{ maxWidth: 1040 }}>
      <Card title="Create document">
        <DocBuilder action={createDocumentAction} initial={init} types={types} clients={clients} projects={projects} type={(types as string[]).includes(sp.type ?? '') ? sp.type : undefined} clientId={sp.client} projectId={sp.project} submit="Save draft" />
      </Card>
    </div>
  );
}

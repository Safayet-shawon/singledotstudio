import Link from 'next/link';
import { requireUser, canAny } from '@/server/auth';
import { q } from '@/server/db';
import { clientScope, docScope, projectScope, taskScope } from '@/server/access';
import { Card, Empty } from '@/components/admin/Ui';

export const metadata = { title: 'Search' };

/** Search is scoped by the same record-level rules as every list, so results never reveal records the user cannot open. */
export default async function Search({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const u = await requireUser();
  const term = ((await searchParams).q ?? '').trim().slice(0, 60);
  if (term.length < 2) return <Card><Empty title="Type at least two characters" /></Card>;
  const like = `%${term}%`;
  const run = async <T,>(sql: (p: unknown[]) => string): Promise<T[]> => { const p: unknown[] = [like]; return q<T>(sql(p), p); };
  const [projects, tasks, clients, docs, people] = await Promise.all([
    canAny(u, ['project.view_assigned', 'project.view_all']) ? run<{ id: string; name: string; code: string }>((p) => `SELECT p.id, p.name, p.code FROM projects p WHERE (p.name ILIKE $1 OR p.code ILIKE $1) AND ${projectScope(u, 'p', p)} LIMIT 8`) : [],
    canAny(u, ['task.view_assigned', 'task.view_all', 'task.create']) ? run<{ id: string; title: string }>((p) => `SELECT t.id, t.title FROM tasks t WHERE t.title ILIKE $1 AND ${taskScope(u, 't', p)} LIMIT 8`) : [],
    canAny(u, ['client.view_assigned', 'client.view_all', 'client.create']) ? run<{ id: string; name: string }>((p) => `SELECT c.id, c.name FROM clients c WHERE (c.name ILIKE $1 OR c.company ILIKE $1) AND ${clientScope(u, 'c', p)} LIMIT 8`) : [],
    run<{ id: string; number: string }>((p) => `SELECT d.id, d.number FROM documents d WHERE d.number ILIKE $1 AND ${docScope(u, 'd', p)} LIMIT 8`),
    canAny(u, ['hr.view_profiles', 'hr.edit_employee']) ? run<{ id: string; name: string; position: string | null }>(() => `SELECT id, name, position FROM users WHERE name ILIKE $1 OR email ILIKE $1 LIMIT 8`) : [],
  ]);
  const none = !projects.length && !tasks.length && !clients.length && !docs.length && !people.length;
  const group = (title: string, items: { href: string; label: string }[]) => items.length ? <Card title={title}><ul className="ad-list">{items.map((i) => <li key={i.href}><Link href={i.href}>{i.label}</Link></li>)}</ul></Card> : null;
  return (
    <div className="ad-grid ad-cols-2" style={{ alignItems: 'start' }}>
      {none && <Card><Empty title={`No results for “${term}”`}>Only records you are allowed to open are searched.</Empty></Card>}
      {group('Projects', projects.map((x) => ({ href: `/admin/projects/${x.id}`, label: `${x.name} (${x.code})` })))}
      {group('Tasks', tasks.map((x) => ({ href: `/admin/tasks/${x.id}`, label: x.title })))}
      {group('Clients', clients.map((x) => ({ href: `/admin/clients/${x.id}`, label: x.name })))}
      {group('Documents', docs.map((x) => ({ href: `/admin/documents/${x.id}`, label: x.number })))}
      {group('Employees', people.map((x) => ({ href: `/admin/employees/${x.id}`, label: `${x.name}${x.position ? ` · ${x.position}` : ''}` })))}
    </div>
  );
}

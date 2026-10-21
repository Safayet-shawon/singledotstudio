import { requireUser, can } from '@/server/auth';
import { redirect } from 'next/navigation';
import { q } from '@/server/db';
import { canSeeBudget, clientScope } from '@/server/access';
import { createProjectAction } from '@/server/actions/projects';
import { ActionForm } from '@/components/admin/Forms';
import { ProjectFields } from '@/components/admin/ProjectFields';
import { Card } from '@/components/admin/Ui';

export const metadata = { title: 'New project' };

export default async function NewProject() {
  const u = await requireUser();
  if (!can(u, 'project.edit') || !(u.isOwner || can(u, 'project.view_all'))) redirect('/admin?denied=1');
  const p: unknown[] = [];
  const clients = await q<{ id: string; name: string }>(`SELECT c.id, c.name FROM clients c WHERE ${clientScope(u, 'c', p)} ORDER BY c.name LIMIT 300`, p);
  return <div style={{ maxWidth: 860 }}><Card title="Create project"><ActionForm action={createProjectAction} submit="Create project"><ProjectFields clients={clients} showBudget={canSeeBudget(u)} /></ActionForm></Card></div>;
}

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser, can } from '@/server/auth';
import { q, q1, num } from '@/server/db';
import { canSeeBudget, canViewClient, canViewProject, clientScope, docScope, isProjectManager, taskScope } from '@/server/access';
import { completionPct } from '@/server/perms';
import { filesFor } from '@/server/files';
import { addMilestoneAction, setMemberAction, toggleMilestoneAction, updateProjectAction, uploadProjectFileAction } from '@/server/actions/projects';
import { ActionButton, ActionForm } from '@/components/admin/Forms';
import { MemberAdd } from '@/components/admin/ProjectTeam';
import { ProjectFields } from '@/components/admin/ProjectFields';
import { Progress } from '@/components/admin/Charts';
import { Card, Empty, PriorityBadge, StatusBadge, bdt, day, when } from '@/components/admin/Ui';

export const metadata = { title: 'Project' };

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const u = await requireUser();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id) || !(await canViewProject(u, id))) notFound();
  const pr = await q1<{ id: string; code: string; name: string; client_id: string | null; type: string | null; location: string | null; description: string | null; start_on: string | null; due_on: string | null; status: string; budget: string | null }>(
    `SELECT id, code, name, client_id, type, location, description, start_on::text, due_on::text, status, budget FROM projects WHERE id = $1`, [id]);
  if (!pr) notFound();
  const manager = u.isOwner || can(u, 'project.view_all') || (await isProjectManager(u, id));
  const mayEdit = can(u, 'project.edit') && manager;
  const showBudget = canSeeBudget(u);
  const tp: unknown[] = [id];
  const dp: unknown[] = [id];
  const [team, milestones, tasks, docs, files, clientVisible] = await Promise.all([
    q<{ id: string; name: string; role: string; position: string | null }>(`SELECT us.id, us.name, pm.role, us.position FROM project_members pm JOIN users us ON us.id = pm.user_id WHERE pm.project_id = $1 ORDER BY pm.role, us.name`, [id]),
    q<{ id: string; title: string; due_on: string | null; done: boolean }>(`SELECT id, title, due_on::text, done FROM milestones WHERE project_id = $1 ORDER BY due_on NULLS LAST, title`, [id]),
    q<{ id: string; title: string; status: string; priority: string; due_on: string | null }>(`SELECT t.id, t.title, t.status, t.priority, t.due_on::text FROM tasks t WHERE t.project_id = $1 AND ${taskScope(u, 't', tp)} ORDER BY t.created_at DESC LIMIT 100`, tp),
    can(u, 'client.view_docs') || can(u, 'fin.view') || can(u, 'fin.view_all_documents') ? q<{ id: string; number: string; type: string; status: string; total: string }>(`SELECT d.id, d.number, d.type, d.status, d.total FROM documents d WHERE d.project_id = $1 AND ${docScope(u, 'd', dp)} ORDER BY d.created_at DESC`, dp) : Promise.resolve([]),
    can(u, 'project.view_files') ? filesFor('project', id) : Promise.resolve([]),
    pr.client_id ? canViewClient(u, pr.client_id) : Promise.resolve(false),
  ]);
  const done = tasks.filter((t) => t.status === 'completed').length;
  const pct = completionPct(done, tasks.length);
  const clientRow = pr.client_id && clientVisible ? await q1<{ id: string; name: string }>(`SELECT id, name FROM clients WHERE id = $1`, [pr.client_id]) : null;
  let clients: { id: string; name: string }[] = [];
  let people: { id: string; name: string }[] = [];
  if (mayEdit) {
    const cp: unknown[] = [];
    clients = await q(`SELECT c.id, c.name FROM clients c WHERE ${clientScope(u, 'c', cp)} ORDER BY c.name LIMIT 300`, cp);
    people = await q(`SELECT id, name FROM users WHERE status <> 'inactive' AND id NOT IN (SELECT user_id FROM project_members WHERE project_id = $1) ORDER BY name`, [id]);
  }

  return (
    <div className="ad-grid ad-cols-21" style={{ alignItems: 'start' }}>
      <div className="ad-grid">
        <Card>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}><span className="ad-badge green">{pr.code}</span><StatusBadge s={pr.status} label={pr.status.replace('_', ' ')} />{pr.type && <span className="ad-badge">{pr.type}</span>}</div>
          <h2 style={{ marginTop: 8 }}>{pr.name}</h2>
          <p className="muted" style={{ margin: '4px 0 12px' }}>{pr.location ?? 'No location'} · {day(pr.start_on)} to {day(pr.due_on)}{clientRow && <> · Client: <Link href={`/admin/clients/${clientRow.id}`}>{clientRow.name}</Link></>}{pr.client_id && !clientRow && ' · Client details restricted'}</p>
          {pr.description && <p style={{ whiteSpace: 'pre-wrap' }}>{pr.description}</p>}
          <Progress pct={pct} /><p className="muted small" style={{ margin: '6px 0 0' }}>{done} of {tasks.length} tasks completed ({pct}%)</p>
        </Card>

        <Card title="Tasks" action={can(u, 'task.create') && <Link className="ad-btn sm primary" href={`/admin/tasks/new?project=${id}`}>+ Add task</Link>}>
          {tasks.length === 0 ? <Empty title="No tasks yet" /> : <ul className="ad-list">{tasks.map((t) => <li key={t.id}><span><Link href={`/admin/tasks/${t.id}`}><b>{t.title}</b></Link><br /><span className="muted small">Due {day(t.due_on)}</span></span><span style={{ display: 'flex', gap: 6 }}><PriorityBadge p={t.priority} /><StatusBadge s={t.status} /></span></li>)}</ul>}
        </Card>

        <Card title="Milestones">
          {milestones.length === 0 ? <p className="muted">No milestones yet.</p> : <ul className="ad-list">{milestones.map((m) => (
            <li key={m.id}><span style={{ opacity: m.done ? 0.6 : 1, textDecoration: m.done ? 'line-through' : undefined }}>{m.title} <span className="muted small">{m.due_on ? `· ${day(m.due_on)}` : ''}</span></span>
              {can(u, 'project.milestones') && <ActionButton action={toggleMilestoneAction.bind(null, m.id, id, !m.done)} label={m.done ? 'Reopen' : 'Mark done'} />}</li>))}</ul>}
          {can(u, 'project.milestones') && (
            <ActionForm action={addMilestoneAction} submit="Add milestone" resetOnOk>
              <input type="hidden" name="project_id" value={id} />
              <div className="ad-row"><div className="ad-field"><label htmlFor="mt">Milestone</label><input id="mt" name="title" type="text" required /></div><div className="ad-field"><label htmlFor="md">Date</label><input id="md" name="due_on" type="date" /></div></div>
            </ActionForm>
          )}
        </Card>

        {can(u, 'project.view_files') && (
          <Card title="Files and drawings">
            {files.length === 0 ? <p className="muted">No files uploaded.</p> : <ul className="ad-list">{files.map((f) => <li key={f.id}><span><a href={`/admin/files/${f.id}`}>{f.name}</a><br /><span className="muted small">{f.uploader ?? 'unknown'} · {when(f.created_at)}</span></span></li>)}</ul>}
            {can(u, 'project.upload_files') && (
              <ActionForm action={uploadProjectFileAction} submit="Upload" resetOnOk>
                <input type="hidden" name="project_id" value={id} />
                <div className="ad-field"><label htmlFor="pf">Add a drawing, image or document (up to 4 MB)</label><input id="pf" name="file" type="file" required /></div>
              </ActionForm>
            )}
          </Card>
        )}

        {mayEdit && (
          <Card title="Edit project"><ActionForm action={updateProjectAction} submit="Save project"><input type="hidden" name="id" value={id} /><ProjectFields v={pr} clients={clients} showBudget={showBudget} /></ActionForm></Card>
        )}
      </div>

      <div className="ad-grid">
        {showBudget && <Card title="Budget"><b style={{ fontSize: '1.5rem' }}>{pr.budget ? bdt(num(pr.budget)) : 'Not set'}</b></Card>}
        <Card title="Team">
          <ul className="ad-list">{team.map((m) => (
            <li key={m.id}><span>{m.name}<br /><span className="muted small">{m.position ?? ''}</span></span>
              <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}><span className={`ad-badge ${m.role === 'manager' ? 'green' : ''}`}>{m.role}</span>{mayEdit && <ActionButton action={setMemberAction.bind(null, id, m.id, 'remove')} label="Remove" confirm={`Remove ${m.name} from this project? They will lose access to it.`} />}</span></li>))}</ul>
          {mayEdit && <MemberAdd projectId={id} people={people} action={setMemberAction} />}
        </Card>
        {docs.length > 0 && (
          <Card title="Documents"><ul className="ad-list">{docs.map((d) => <li key={d.id}><Link href={`/admin/documents/${d.id}`}>{d.number}</Link><StatusBadge s={d.status} /></li>)}</ul></Card>
        )}
      </div>
    </div>
  );
}

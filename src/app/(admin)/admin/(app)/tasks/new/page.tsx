import { requireUser, pageCan, can } from '@/server/auth';
import { q } from '@/server/db';
import { projectScope } from '@/server/access';
import { createTaskAction } from '@/server/actions/tasks';
import { ActionForm } from '@/components/admin/Forms';
import { Card } from '@/components/admin/Ui';

export const metadata = { title: 'New task' };

export default async function NewTask({ searchParams }: { searchParams: Promise<{ project?: string }> }) {
  const u = await requireUser();
  pageCan(u, 'task.create');
  const pre = (await searchParams).project ?? '';
  const p: unknown[] = [];
  const projects = await q<{ id: string; name: string; code: string }>(`SELECT p.id, p.name, p.code FROM projects p WHERE ${projectScope(u, 'p', p)} AND p.status NOT IN ('completed','cancelled') ORDER BY p.name LIMIT 200`, p);
  const people = can(u, 'task.assign') ? await q<{ id: string; name: string; position: string | null }>(`SELECT id, name, position FROM users WHERE status <> 'inactive' ORDER BY name`) : [];
  return (
    <div style={{ maxWidth: 820 }}>
      <Card title="Create task">
        <ActionForm action={createTaskAction} submit="Create task">
          <div className="ad-field"><label htmlFor="t">Title</label><input id="t" name="title" type="text" required /></div>
          <div className="ad-field"><label htmlFor="d">Description</label><textarea id="d" name="description" /></div>
          <div className="ad-row three">
            <div className="ad-field"><label htmlFor="p">Project</label><select id="p" name="project_id" defaultValue={pre}><option value="">No project</option>{projects.map((x) => <option key={x.id} value={x.id}>{x.code} · {x.name}</option>)}</select></div>
            <div className="ad-field"><label htmlFor="pr">Priority</label><select id="pr" name="priority" defaultValue="medium">{['low', 'medium', 'high', 'urgent'].map((x) => <option key={x}>{x}</option>)}</select></div>
            {can(u, 'task.deadline') && <div className="ad-field"><label htmlFor="du">Deadline</label><input id="du" name="due_on" type="date" /></div>}
          </div>
          {people.length > 0 ? (
            <div className="ad-field"><span className="ad-label">Assign to (every assignee must already be on the project team)</span>
              <div className="ad-chips" style={{ marginTop: 6 }}>{people.map((x) => <label key={x.id} className="ad-perm" style={{ border: '1px solid var(--line)', borderRadius: 10, padding: '6px 12px' }}><input type="checkbox" name="assignees" value={x.id} /><span>{x.name}{x.position && <small style={{ color: 'var(--tx2)' }}>{x.position}</small>}</span></label>)}</div></div>
          ) : <p className="muted small">The task will be assigned to you.</p>}
        </ActionForm>
      </Card>
    </div>
  );
}

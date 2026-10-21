import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser, can } from '@/server/auth';
import { q, q1 } from '@/server/db';
import { canViewTask, isAssignee } from '@/server/access';
import { filesFor } from '@/server/files';
import { changeStatusAction, commentAction, reassignAction, setDeadlineAction, uploadTaskFileAction } from '@/server/actions/tasks';
import { ActionButton, ActionForm, PromptButton } from '@/components/admin/Forms';
import { Card, PriorityBadge, StatusBadge, day, when } from '@/components/admin/Ui';

export const metadata = { title: 'Task' };

export default async function TaskPage({ params }: { params: Promise<{ id: string }> }) {
  const u = await requireUser();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id) || !(await canViewTask(u, id))) notFound(); // same response whether it exists or not
  const t = await q1<{ id: string; title: string; description: string | null; status: string; priority: string; due_on: string | null; project_id: string | null; project: string | null; creator: string | null; created_at: string; completed_at: string | null }>(
    `SELECT t.id, t.title, t.description, t.status, t.priority, t.due_on::text, t.project_id, pr.name AS project, c.name AS creator, t.created_at, t.completed_at FROM tasks t LEFT JOIN projects pr ON pr.id = t.project_id LEFT JOIN users c ON c.id = t.created_by WHERE t.id = $1`, [id]);
  if (!t) notFound();
  const [assignees, events, files] = await Promise.all([
    q<{ id: string; name: string }>(`SELECT us.id, us.name FROM task_assignees ta JOIN users us ON us.id = ta.user_id WHERE ta.task_id = $1 ORDER BY us.name`, [id]),
    q<{ id: string; kind: string; to_status: string | null; from_status: string | null; note: string | null; created_at: string; who: string | null }>(`SELECT e.id::text, e.kind, e.to_status, e.from_status, e.note, e.created_at, us.name AS who FROM task_events e LEFT JOIN users us ON us.id = e.user_id WHERE e.task_id = $1 ORDER BY e.created_at DESC LIMIT 60`, [id]),
    filesFor('task', id),
  ]);
  const isA = await isAssignee(u, id);
  const showFiles = true;
  const canReassign = can(u, 'task.reassign');
  const people = canReassign ? await q<{ id: string; name: string }>(
    t.project_id ? `SELECT us.id, us.name FROM project_members pm JOIN users us ON us.id = pm.user_id WHERE pm.project_id = $1 AND us.status <> 'inactive' ORDER BY us.name` : `SELECT id, name FROM users WHERE status <> 'inactive' AND $1::text IS NULL ORDER BY name`,
    [t.project_id]) : [];

  const st = t.status;
  const may = (to: string) => {
    if (u.isOwner) return true;
    if (to === 'in_progress') return isA && (can(u, 'task.change_status') || can(u, 'task.update_progress')) && (st === 'assigned' || st === 'revision');
    if (to === 'submitted') return isA && can(u, 'task.change_status') && st === 'in_progress';
    if (to === 'completed') return can(u, 'task.approve') && !isA && st === 'submitted';
    if (to === 'revision') return can(u, 'task.request_revision') && !isA && st === 'submitted';
    return false;
  };

  return (
    <div className="ad-grid ad-cols-21" style={{ alignItems: 'start' }}>
      <div className="ad-grid">
        <Card>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 8 }}><StatusBadge s={st} /><PriorityBadge p={t.priority} />{t.due_on && <span className="ad-badge">Due {day(t.due_on)}</span>}</div>
          <h2>{t.title}</h2>
          {t.description && <p style={{ marginTop: 10, whiteSpace: 'pre-wrap' }}>{t.description}</p>}
          <p className="muted small" style={{ margin: '10px 0 0' }}>{t.project_id ? <>Project: <Link href={`/admin/projects/${t.project_id}`}>{t.project}</Link> · </> : null}Created by {t.creator ?? 'unknown'} on {day(t.created_at)}{t.completed_at && <> · Completed {day(t.completed_at)}</>}</p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 16 }}>
            {may('in_progress') && <ActionButton action={changeStatusAction.bind(null, id, 'in_progress', undefined)} label={st === 'revision' ? 'Start revision' : 'Start work'} tone="primary" size="" />}
            {may('submitted') && <PromptButton action={changeStatusAction.bind(null, id, 'submitted')} label="Submit for review" question="Add a short note for the reviewer (optional):" tone="primary" />}
            {may('completed') && <ActionButton action={changeStatusAction.bind(null, id, 'completed', undefined)} label="Approve work" tone="primary" size="" confirm="Approve this work and mark the task completed?" />}
            {may('revision') && <PromptButton action={changeStatusAction.bind(null, id, 'revision')} label="Request revision" question="What needs to change?" tone="danger" />}
            {u.isOwner && st === 'completed' && <ActionButton action={changeStatusAction.bind(null, id, 'in_progress', 'Reopened')} label="Reopen" />}
          </div>
        </Card>

        {showFiles && (
          <Card title="Files and submissions">
            {files.length === 0 ? <p className="muted">No files yet.</p> : <ul className="ad-list">{files.map((f) => <li key={f.id}><span><a href={`/admin/files/${f.id}`}>{f.name}</a><br /><span className="muted small">{f.uploader ?? 'unknown'} · {when(f.created_at)} · {Math.round(f.size / 1024)} KB</span></span></li>)}</ul>}
            {can(u, 'task.upload') && (isA || u.isOwner || can(u, 'task.assign')) && (
              <ActionForm action={uploadTaskFileAction} submit="Upload" resetOnOk className="ad-form">
                <input type="hidden" name="task_id" value={id} />
                <div className="ad-field"><label htmlFor="f">Attach a file (up to 4 MB)</label><input id="f" name="file" type="file" required /></div>
              </ActionForm>
            )}
          </Card>
        )}

        <Card title="Discussion and history">
          {can(u, 'task.comment') && (
            <ActionForm action={commentAction} submit="Post comment" resetOnOk>
              <input type="hidden" name="task_id" value={id} />
              <div className="ad-field"><label htmlFor="c">Add a comment</label><textarea id="c" name="note" required /></div>
            </ActionForm>
          )}
          <ul className="ad-timeline" style={{ marginTop: 18 }}>{events.map((e) => (
            <li key={e.id}>
              <b>{e.kind === 'status' ? <>Status: {e.to_status ? <StatusBadge s={e.to_status} /> : null}</> : e.kind === 'comment' ? 'Comment' : e.kind[0].toUpperCase() + e.kind.slice(1)}</b>
              {e.note && <p style={{ margin: '2px 0 0', whiteSpace: 'pre-wrap' }}>{e.note}</p>}
              <span className="muted small">{e.who ?? 'System'} · {when(e.created_at)}</span>
            </li>))}</ul>
        </Card>
      </div>

      <div className="ad-grid">
        <Card title="Assigned to">
          {assignees.length === 0 ? <p className="muted">Nobody yet.</p> : <ul className="ad-list">{assignees.map((a) => <li key={a.id}>{a.name}</li>)}</ul>}
          {canReassign && people.length > 0 && (
            <ActionForm action={reassignAction} submit="Update assignment">
              <input type="hidden" name="task_id" value={id} />
              <span className="ad-label">Reassign (project team members)</span>
              <div style={{ display: 'grid', gap: 6 }}>{people.map((p) => <label key={p.id} className="ad-perm" style={{ border: 0, padding: '4px 0' }}><input type="checkbox" name="assignees" value={p.id} defaultChecked={assignees.some((a) => a.id === p.id)} /><span>{p.name}</span></label>)}</div>
            </ActionForm>
          )}
        </Card>
        {can(u, 'task.deadline') && (
          <Card title="Deadline and priority">
            <ActionForm action={setDeadlineAction} submit="Save">
              <input type="hidden" name="task_id" value={id} />
              <div className="ad-field"><label htmlFor="dd">Deadline</label><input id="dd" name="due_on" type="date" defaultValue={t.due_on ?? ''} /></div>
              <div className="ad-field"><label htmlFor="pp">Priority</label><select id="pp" name="priority" defaultValue={t.priority}>{['low', 'medium', 'high', 'urgent'].map((x) => <option key={x}>{x}</option>)}</select></div>
            </ActionForm>
          </Card>
        )}
      </div>
    </div>
  );
}

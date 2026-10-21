import { notFound } from 'next/navigation';
import { requireUser, pageCan, can } from '@/server/auth';
import { q, q1, num } from '@/server/db';
import { toUser, USER_COLUMNS } from '@/server/auth';
import { approveSalaryAction, resendInviteAction, saveSalaryAction, setEmployeeStatusAction, updateEmployeeAction, updatePermissionsAction } from '@/server/actions/employees';
import { ActionButton, ActionForm, PermEditor } from '@/components/admin/Forms';
import { EmployeeFields } from '@/components/admin/EmployeeFields';
import { Card, Empty, StatusBadge, Tabs, bdt, when } from '@/components/admin/Ui';

export const metadata = { title: 'Employee' };

export default async function EmployeePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> }) {
  const u = await requireUser();
  pageCan(u, ['hr.view_profiles', 'hr.edit_employee', 'hr.create_employee']);
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const row = await q1<Record<string, unknown>>(`SELECT ${USER_COLUMNS}, last_login FROM users WHERE id = $1`, [id]);
  if (!row) notFound();
  const emp = toUser(row);
  const tab = (await searchParams).tab ?? 'overview';
  const mayEdit = can(u, 'hr.edit_employee') && (!emp.isOwner || u.isOwner);
  const mayPerms = (u.isOwner || can(u, 'admin.edit_permissions')) && !emp.isOwner && emp.id !== u.id;
  const maySalary = can(u, 'hr.view_salary') || can(u, 'hr.view_payroll');
  const base = `/admin/employees/${id}`;
  const tabs = [{ href: base, label: 'Overview' }, ...(mayPerms || u.isOwner ? [{ href: `${base}?tab=access`, label: 'Access' }] : []), ...(maySalary ? [{ href: `${base}?tab=salary`, label: 'Salary' }] : []), { href: `${base}?tab=activity`, label: 'Activity' }];
  const current = tab === 'overview' ? base : `${base}?tab=${tab}`;
  const managers = await q<{ id: string; name: string }>(`SELECT id, name FROM users WHERE status <> 'inactive' ORDER BY name`);

  return (
    <div className="ad-grid" style={{ maxWidth: 1000 }}>
      <Card>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          <span className="ad-avatar" style={{ width: 60, height: 60, fontSize: '1.3rem' }}>{emp.name.split(/\s+/).slice(0, 2).map((x) => x[0]).join('')}</span>
          <div style={{ flex: 1, minWidth: 200 }}>
            <h2>{emp.name}</h2>
            <p className="muted" style={{ margin: 0 }}>{emp.isOwner ? 'Main Admin' : emp.position ?? 'No position'}{emp.department ? ` · ${emp.department}` : ''} · {emp.email}</p>
          </div>
          <StatusBadge s={emp.status} />
        </div>
      </Card>
      <Tabs items={tabs} current={current} />

      {tab === 'overview' && (
        <>
          {mayEdit ? (
            <Card title="Details">
              <ActionForm action={updateEmployeeAction} submit="Save details">
                <input type="hidden" name="id" value={id} />
                <EmployeeFields v={emp} managers={managers} />
              </ActionForm>
            </Card>
          ) : <Card title="Details"><p className="muted">Phone: {emp.phone ?? '-'} · Employee ID: {emp.employeeCode ?? '-'} · Joined: {emp.joinedOn ?? '-'}</p></Card>}
          {!emp.isOwner && can(u, 'hr.deactivate') && emp.id !== u.id && (
            <Card title="Account status">
              <p className="muted">Deactivating signs the person out everywhere and blocks sign-in. Their records and history are kept.</p>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {emp.status === 'inactive'
                  ? <ActionButton action={setEmployeeStatusAction.bind(null, id, true)} label="Reactivate account" tone="primary" />
                  : <ActionButton action={setEmployeeStatusAction.bind(null, id, false)} label="Deactivate account" tone="danger" confirm={`Deactivate ${emp.name}? They will be signed out immediately.`} />}
                {emp.status !== 'inactive' && mayEdit && <ActionButton action={resendInviteAction.bind(null, id)} label={emp.status === 'invited' ? 'Resend invitation' : 'Send password reset link'} />}
              </div>
            </Card>
          )}
          <p className="muted small">Last sign-in: {row.last_login ? when(String(row.last_login)) : 'never'}</p>
        </>
      )}

      {tab === 'access' && (
        <Card title="Permissions">
          {emp.isOwner ? <p className="muted">The Main Admin has full access by definition. Ownership can only be moved through the protected transfer in Settings.</p> : mayPerms ? (
            <ActionForm action={updatePermissionsAction} submit="Save permissions">
              <input type="hidden" name="id" value={id} />
              <p className="muted">Changes take effect immediately, including for people who are signed in now.</p>
              <PermEditor initial={emp.perms} grantable={u.isOwner ? 'all' : u.perms} />
            </ActionForm>
          ) : <p className="muted">You cannot edit this person&apos;s permissions{emp.id === u.id ? ' (nobody can change their own access)' : ''}.</p>}
        </Card>
      )}

      {tab === 'salary' && maySalary && <Salary id={id} u={u} />}

      {tab === 'activity' && <Activity id={id} />}
    </div>
  );
}

async function Salary({ id, u }: { id: string; u: Awaited<ReturnType<typeof requireUser>> }) {
  const viewRows = can(u, 'hr.view_salary');
  const rows = viewRows ? await q<{ id: string; month: string; amount: string; note: string | null; status: string; entered_by: string | null }>(`SELECT id, month, amount, note, status, entered_by FROM salary_records WHERE user_id = $1 ORDER BY month DESC LIMIT 24`, [id]) : [];
  const sum = can(u, 'hr.view_payroll') ? await q1<{ n: string }>(`SELECT coalesce(sum(amount),0)::text AS n FROM salary_records WHERE user_id = $1 AND status = 'approved'`, [id]) : null;
  return (
    <>
      {sum && <Card title="Payroll summary"><p style={{ margin: 0 }}>Approved to date: <b>{bdt(num(sum.n))}</b></p></Card>}
      {viewRows && (
        <Card title="Salary records">
          {rows.length === 0 ? <Empty title="No salary records" /> : (
            <div className="ad-tablewrap"><table><thead><tr><th>Month</th><th className="num">Amount</th><th>Note</th><th>Status</th><th /></tr></thead>
              <tbody>{rows.map((r) => (
                <tr key={r.id}><td>{r.month}</td><td className="num">{bdt(num(r.amount))}</td><td>{r.note ?? '-'}</td><td><StatusBadge s={r.status === 'approved' ? 'approved' : 'draft'} label={r.status === 'approved' ? 'Approved' : 'Draft'} /></td>
                  <td>{r.status === 'draft' && can(u, 'hr.approve_payroll') && r.entered_by !== u.id && id !== u.id && <ActionButton action={approveSalaryAction.bind(null, r.id)} label="Approve" tone="primary" />}</td></tr>))}</tbody></table></div>
          )}
        </Card>
      )}
      {(can(u, 'hr.enter_salary') || can(u, 'hr.edit_salary')) && (
        <Card title="Enter or update a month">
          <ActionForm action={saveSalaryAction} submit="Save salary" resetOnOk>
            <input type="hidden" name="user_id" value={id} />
            <div className="ad-row three">
              <div className="ad-field"><label htmlFor="sm">Month</label><input id="sm" name="month" type="text" placeholder="2026-10" pattern="\d{4}-\d{2}" required /></div>
              <div className="ad-field"><label htmlFor="sa">Amount (BDT)</label><input id="sa" name="amount" type="number" min="0" step="1" required /></div>
              <div className="ad-field"><label htmlFor="sn">Note</label><input id="sn" name="note" type="text" /></div>
            </div>
            <p className="muted small">Entering, editing and approving payroll are separate permissions. Approved months are locked, and nobody approves their own entries.</p>
          </ActionForm>
        </Card>
      )}
    </>
  );
}

async function Activity({ id }: { id: string }) {
  const rows = await q<{ action: string; actor_name: string | null; created_at: string; detail: Record<string, unknown> | null }>(`SELECT action, actor_name, created_at, detail FROM audit_log WHERE entity = 'user' AND entity_id = $1 ORDER BY created_at DESC LIMIT 30`, [id]);
  return (
    <Card title="Account history">
      {rows.length === 0 ? <Empty title="No recorded activity" /> : <ul className="ad-timeline">{rows.map((r, i) => <li key={i}><b>{r.action}</b><br /><span className="muted small">{r.actor_name ?? 'System'} · {when(r.created_at)}</span></li>)}</ul>}
    </Card>
  );
}

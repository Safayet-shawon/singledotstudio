import { requireUser, pageCan, can } from '@/server/auth';
import { q } from '@/server/db';
import { createEmployeeAction } from '@/server/actions/employees';
import { ActionForm, PermEditor } from '@/components/admin/Forms';
import { EmployeeFields } from '@/components/admin/EmployeeFields';
import { Card } from '@/components/admin/Ui';

export const metadata = { title: 'Create employee' };

export default async function NewEmployee() {
  const u = await requireUser();
  pageCan(u, 'hr.create_employee');
  const managers = await q<{ id: string; name: string }>(`SELECT id, name FROM users WHERE status <> 'inactive' ORDER BY name`);
  const mayGrant = u.isOwner || can(u, 'admin.edit_permissions');
  return (
    <div className="ad-grid" style={{ maxWidth: 980 }}>
      <ActionForm action={createEmployeeAction} submit="Create account" resetOnOk>
        <Card title="1. Employee details"><div className="ad-form"><EmployeeFields managers={managers} /></div></Card>
        <Card title="2. Access and permissions">
          {mayGrant ? (
            <>
              <p className="muted">Nobody gets access from a job title. Tick exactly what this person may do. You can change it any time, and changes apply immediately.</p>
              <PermEditor initial={[]} grantable={u.isOwner ? 'all' : u.perms} />
            </>
          ) : <p className="ad-msg warn">You can create the account, but only someone with permission-editing rights can grant access. The account starts with no access.</p>}
        </Card>
        <Card title="3. Review"><p className="muted" style={{ margin: 0 }}>On saving, the employee receives a one-time link to set their own password (valid 7 days). Passwords are never stored in plain text or shown to anyone. If email delivery is not configured you will be shown the link to send yourself.</p></Card>
      </ActionForm>
    </div>
  );
}

import Link from 'next/link';
import { requireUser, pageCan, can } from '@/server/auth';
import { q } from '@/server/db';
import { Card, Empty, StatusBadge, day } from '@/components/admin/Ui';

export const metadata = { title: 'Employees' };

export default async function Employees({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  const u = await requireUser();
  pageCan(u, ['hr.view_profiles', 'hr.create_employee', 'hr.edit_employee']);
  const sp = await searchParams;
  const term = (sp.q ?? '').trim().slice(0, 60);
  const status = ['active', 'invited', 'inactive'].includes(sp.status ?? '') ? sp.status! : '';
  const params: unknown[] = [];
  const where: string[] = [];
  if (term) { params.push(`%${term}%`); where.push(`(name ILIKE $${params.length} OR email ILIKE $${params.length} OR position ILIKE $${params.length} OR department ILIKE $${params.length} OR employee_code ILIKE $${params.length})`); }
  if (status) { params.push(status); where.push(`status = $${params.length}`); }
  const rows = await q<{ id: string; name: string; email: string; position: string | null; department: string | null; employee_code: string | null; status: string; is_owner: boolean; joined_on: string | null; perms: string[] }>(
    `SELECT id, name, email, position, department, employee_code, status, is_owner, joined_on, perms FROM users ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY is_owner DESC, name LIMIT 200`, params);
  return (
    <div className="ad-grid">
      <form className="ad-toolbar" role="search">
        <input type="search" name="q" defaultValue={term} placeholder="Search name, email, position, department…" style={{ maxWidth: 360 }} />
        <select name="status" defaultValue={status} style={{ width: 160 }}><option value="">All statuses</option><option value="active">Active</option><option value="invited">Invited</option><option value="inactive">Inactive</option></select>
        <button className="ad-btn">Filter</button>
        <span className="grow" />
        {can(u, 'hr.create_employee') && <Link href="/admin/employees/new" className="ad-btn primary">+ Create employee account</Link>}
      </form>
      <Card>
        {rows.length === 0 ? <Empty title="No employees found" /> : (
          <div className="ad-tablewrap" style={{ border: 0, boxShadow: 'none' }}>
            <table>
              <thead><tr><th>Name</th><th>Position</th><th>Department</th><th>ID</th><th>Joined</th><th>Access</th><th>Status</th></tr></thead>
              <tbody>{rows.map((r) => (
                <tr key={r.id}>
                  <td><Link href={`/admin/employees/${r.id}`}><b>{r.name}</b></Link><br /><span className="muted small">{r.email}</span></td>
                  <td>{r.is_owner ? 'Main Admin' : r.position ?? '-'}</td><td>{r.department ?? '-'}</td><td>{r.employee_code ?? '-'}</td><td>{day(r.joined_on)}</td>
                  <td>{r.is_owner ? <span className="ad-badge green">Full access</span> : <span className="ad-badge">{r.perms.length} permission{r.perms.length === 1 ? '' : 's'}</span>}</td>
                  <td><StatusBadge s={r.status} /></td>
                </tr>))}</tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

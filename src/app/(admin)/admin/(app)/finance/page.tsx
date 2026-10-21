import { requireUser, pageCan, can } from '@/server/auth';
import { q, q1, num } from '@/server/db';
import { docScope, projectScope } from '@/server/access';
import { approveExpenseAction, addExpenseAction } from '@/server/actions/finance';
import { ActionButton, ActionForm } from '@/components/admin/Forms';
import { Card, Empty, Stat, StatusBadge, bdt, day } from '@/components/admin/Ui';
import { Bars } from '@/components/admin/Charts';
import { monthlyDocTotals } from '@/server/queries';

export const metadata = { title: 'Finance' };

export default async function Finance() {
  const u = await requireUser();
  pageCan(u, ['fin.view', 'fin.view_revenue', 'fin.view_profit', 'fin.expense_enter', 'fin.view_payments']);
  const revenue = can(u, 'fin.view_revenue') || u.isOwner, profit = can(u, 'fin.view_profit') || u.isOwner, payments = can(u, 'fin.view_payments') || u.isOwner, expensesView = can(u, 'fin.view') || can(u, 'fin.expense_enter') || u.isOwner;
  const dp: unknown[] = [];
  const dscope = docScope(u, 'd', dp);
  const rev = revenue || profit ? await q1<{ month: string; total: string; invoiced: string }>(`SELECT coalesce(sum(pay.amount) FILTER (WHERE date_trunc('month', pay.paid_on) = date_trunc('month', current_date)), 0)::text AS month, coalesce(sum(pay.amount),0)::text AS total,
      (SELECT coalesce(sum(d2.total),0) FROM documents d2 WHERE d2.type = 'invoice' AND d2.status IN ('approved','sent') AND ${dscope.replace(/\bd\./g, 'd2.')})::text AS invoiced
      FROM payments pay JOIN documents d ON d.id = pay.document_id WHERE ${dscope}`, dp) : null;
  const exp = profit ? await q1<{ n: string }>(`SELECT coalesce(sum(amount),0)::text AS n FROM expenses WHERE status = 'approved'`) : null;
  const trend = revenue ? await monthlyDocTotals(u, 'invoice') : null;
  const pp: unknown[] = [];
  const projects = can(u, 'fin.expense_enter') ? await q<{ id: string; name: string }>(`SELECT p.id, p.name FROM projects p WHERE ${projectScope(u, 'p', pp)} ORDER BY p.name LIMIT 200`, pp) : [];
  const expenses = expensesView ? await q<{ id: string; title: string; amount: string; spent_on: string; status: string; project: string | null; by: string | null; entered_by: string | null }>(
    `SELECT e.id, e.title, e.amount, e.spent_on::text, e.status, pr.name AS project, us.name AS by, e.entered_by FROM expenses e LEFT JOIN projects pr ON pr.id = e.project_id LEFT JOIN users us ON us.id = e.entered_by ORDER BY e.created_at DESC LIMIT 100`) : [];
  const payParams: unknown[] = [];
  const payScope = docScope(u, 'd', payParams);
  const pay = payments ? await q<{ id: string; amount: string; paid_on: string; method: string | null; number: string; did: string }>(`SELECT p.id, p.amount, p.paid_on::text, p.method, d.number, d.id AS did FROM payments p JOIN documents d ON d.id = p.document_id WHERE ${payScope} ORDER BY p.paid_on DESC LIMIT 30`, payParams) : [];
  const received = rev ? num(rev.total) : 0, outstanding = rev ? Math.max(0, num(rev.invoiced) - received) : 0;
  return (
    <div className="ad-grid">
      <div className="ad-grid ad-cols-4">
        {rev && <Stat i={1} label="Payments this month" value={num(rev.month)} money icon="trend" />}
        {rev && <Stat i={2} label="Received to date" value={received} money icon="coin" />}
        {rev && <Stat i={3} label="Outstanding (open invoices)" value={outstanding} money icon="alert" tone={outstanding ? 'warn' : ''} href="/admin/documents?type=invoice" />}
        {profit && exp && rev && <Stat i={4} label="Received minus approved expenses" value={received - num(exp.n)} money icon="file" sub="Cash basis, from recorded entries only" />}
      </div>
      {trend && <Card title="Invoiced per month"><Bars data={trend} money /></Card>}
      <div className="ad-grid ad-cols-2" style={{ alignItems: 'start' }}>
        {expensesView && (
          <Card title="Expenses">
            {expenses.length === 0 ? <Empty title="No expenses recorded" /> : (
              <ul className="ad-list">{expenses.map((e) => (
                <li key={e.id}><span><b>{e.title}</b><br /><span className="muted small">{day(e.spent_on)}{e.project ? ` · ${e.project}` : ''} · {e.by ?? ''}</span></span>
                  <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>{bdt(num(e.amount))}<StatusBadge s={e.status} />{e.status === 'pending' && can(u, 'fin.expense_approve') && e.entered_by !== u.id && <ActionButton action={approveExpenseAction.bind(null, e.id)} label="Approve" tone="primary" />}</span></li>))}</ul>
            )}
            {can(u, 'fin.expense_enter') && (
              <ActionForm action={addExpenseAction} submit="Add expense" resetOnOk>
                <div className="ad-row"><div className="ad-field"><label htmlFor="et">What was it for?</label><input id="et" name="title" type="text" required /></div><div className="ad-field"><label htmlFor="ea">Amount (BDT)</label><input id="ea" name="amount" type="number" min="0" step="0.01" required /></div></div>
                <div className="ad-row"><div className="ad-field"><label htmlFor="ed">Date</label><input id="ed" name="spent_on" type="date" /></div><div className="ad-field"><label htmlFor="ep">Project</label><select id="ep" name="project_id"><option value="">None</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div></div>
              </ActionForm>
            )}
          </Card>
        )}
        {payments && (
          <Card title="Recent payments">
            {pay.length === 0 ? <Empty title="No payments recorded">Payments appear here only when someone records them on an invoice.</Empty> : <ul className="ad-list">{pay.map((p) => <li key={p.id}><a href={`/admin/documents/${p.did}`}>{p.number}</a><span>{bdt(num(p.amount))} · {day(p.paid_on)}</span></li>)}</ul>}
          </Card>
        )}
      </div>
    </div>
  );
}

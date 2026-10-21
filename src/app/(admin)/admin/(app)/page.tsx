import Link from 'next/link';
import { requireUser, can, canAny } from '@/server/auth';
import {
  canSeeFinance, completionTrend, financeSummary, isWide, monthlyDocTotals, projectCounts, projectProgress, recentActivity, taskCounts, upcomingTasks, workloadByEmployee, workloadByProject,
} from '@/server/queries';
import { statusLabel } from '@/server/perms';
import { Bars, Donut, LineChart, Progress } from '@/components/admin/Charts';
import { Card, Empty, PriorityBadge, Stat, StatusBadge, bdt, day, when } from '@/components/admin/Ui';

export const metadata = { title: 'Dashboard' };

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ denied?: string }> }) {
  const u = await requireUser();
  const denied = (await searchParams).denied;
  const wide = isWide(u);
  const mine = !wide;
  const showTasks = canAny(u, ['task.view_assigned', 'task.view_all', 'task.create']);
  const showProjects = canAny(u, ['project.view_assigned', 'project.view_all']);
  const showFin = canSeeFinance(u);

  const [tc, trend, pp, up, act, pc, wp, we, fin, qm, im] = await Promise.all([
    showTasks ? taskCounts(u, mine) : null,
    showTasks ? completionTrend(u, mine) : null,
    showProjects ? projectProgress(u) : null,
    showTasks ? upcomingTasks(u, mine) : null,
    showTasks ? recentActivity(u) : null,
    showProjects ? projectCounts(u) : null,
    showTasks && mine ? workloadByProject(u) : null,
    showTasks && wide ? workloadByEmployee(u) : null,
    showFin ? financeSummary(u) : null,
    showFin && can(u, 'fin.view_revenue') || showFin && u.isOwner ? monthlyDocTotals(u, 'quotation') : null,
    showFin && can(u, 'fin.view_revenue') || showFin && u.isOwner ? monthlyDocTotals(u, 'invoice') : null,
  ]);

  const nothing = !tc && !pp && !fin;
  return (
    <div className="ad-grid" style={{ gap: 22 }}>
      <div className="ad-card" style={{ background: 'linear-gradient(120deg,#123d2b,#1a5a3d)', color: '#fff', border: 0, ['--i' as string]: 0 }}>
        <h2 style={{ color: '#fff', fontSize: '1.7rem' }}>{greeting()}, {u.name.split(' ')[0]}</h2>
        <p style={{ margin: '4px 0 0', color: '#cfe3d6' }}>
          {wide ? 'Here is how the studio is doing right now.' : 'Here is your work for today.'}
          {tc && tc.overdue > 0 && <> You have <b style={{ color: '#fcd34d' }}>{tc.overdue} overdue</b> task{tc.overdue === 1 ? '' : 's'}.</>}
        </p>
      </div>
      {denied && <p className="ad-msg warn">You do not have access to that page. Ask the Main Admin if you need it.</p>}
      {nothing && <Card><Empty title="Nothing to show yet">Your account has no modules assigned. The Main Admin can grant access from Employees.</Empty></Card>}

      {tc && (
        <div className="ad-grid ad-cols-4">
          <Stat i={1} label={wide ? 'Pending tasks' : 'My pending tasks'} value={tc.pending} icon="clock" href="/admin/tasks" sub={`${tc.in_progress} in progress`} />
          <Stat i={2} label="Awaiting review" value={tc.submitted} icon="eye" href="/admin/tasks?status=submitted" />
          <Stat i={3} label="Overdue" value={tc.overdue} icon="alert" tone={tc.overdue ? 'bad' : ''} href="/admin/tasks?due=overdue" />
          <Stat i={4} label="Completed" value={tc.completed} icon="check" href="/admin/tasks?status=completed" sub={`${tc.pct}% of ${tc.total} task${tc.total === 1 ? '' : 's'}`} />
        </div>
      )}
      {pc && fin && (
        <div className="ad-grid ad-cols-4">
          <Stat i={1} label="Active projects" value={pc.active} icon="folder" href="/admin/projects" sub={`${pc.total} in total`} />
          <Stat i={2} label="Quotations (draft / sent)" value={fin.qDraft + fin.qSent} icon="file" href="/admin/documents" sub={`${fin.qDraft} draft, ${fin.qSent} sent`} />
          <Stat i={3} label="Outstanding invoices" value={fin.outstanding} money icon="coin" href="/admin/documents?type=invoice" sub={`${fin.invOpen} open invoice${fin.invOpen === 1 ? '' : 's'}`} tone={fin.outstanding ? 'warn' : ''} />
          <Stat i={4} label="Payments received (this month)" value={fin.received} money icon="trend" href="/admin/finance" />
        </div>
      )}
      {pc && !fin && (
        <div className="ad-grid ad-cols-4">
          <Stat i={1} label="Projects" value={pc.total} icon="folder" href="/admin/projects" sub={`${pc.active} active`} />
        </div>
      )}

      {tc && (
        <div className="ad-grid ad-cols-21">
          <Card title={wide ? 'Task completion by month' : 'My completed tasks by month'} i={5}>
            {trend && trend.some((t) => t.value > 0) ? <LineChart data={trend} /> : <Empty title="No completed tasks yet">Completed work will chart here, from real task records.</Empty>}
          </Card>
          <Card title="Task status" i={6}>
            {tc.total === 0 ? <Empty title="No tasks yet" /> : (
              <Donut centerLabel="tasks" data={[
                { label: statusLabel('assigned'), value: tc.assigned, color: '#9db8a8' }, { label: statusLabel('in_progress'), value: tc.in_progress, color: '#2b6cb0' },
                { label: 'In review', value: tc.submitted, color: '#c9a227' }, { label: 'Revision', value: tc.revision, color: '#c2410c' }, { label: 'Completed', value: tc.completed, color: '#16a34a' },
              ].filter((d) => d.value > 0)} />
            )}
          </Card>
        </div>
      )}

      <div className="ad-grid ad-cols-2">
        {pp && (
          <Card title="Project progress" i={7} action={<Link href="/admin/projects" className="small">View all</Link>}>
            {pp.length === 0 ? <Empty title="No projects yet" /> : (
              <ul className="ad-list">{pp.map((p) => (
                <li key={p.id} style={{ display: 'grid', gap: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}><Link href={`/admin/projects/${p.id}`}><b>{p.name}</b></Link><span className="muted small">{p.done}/{p.total} tasks · {p.pct}%</span></div>
                  <Progress pct={p.pct} tone={p.due && p.pct < 100 && new Date(p.due) < new Date() ? 'red' : ''} />
                </li>))}</ul>
            )}
          </Card>
        )}
        {up && (
          <Card title="Upcoming deadlines" i={8} action={<Link href="/admin/tasks" className="small">All tasks</Link>}>
            {up.length === 0 ? <Empty title="No deadlines ahead" /> : (
              <ul className="ad-list">{up.map((t) => (
                <li key={t.id}><span><Link href={`/admin/tasks/${t.id}`}><b>{t.title}</b></Link><br /><span className="muted small">{t.project ?? 'No project'} · due {day(t.due)}</span></span>
                  <span style={{ display: 'flex', gap: 6 }}>{t.overdue && <span className="ad-badge red">Overdue</span>}<PriorityBadge p={t.priority} /></span></li>))}</ul>
            )}
          </Card>
        )}
      </div>

      <div className="ad-grid ad-cols-2">
        {tc && !wide && wp && (
          <Card title="My workload by project" i={9}>{wp.length === 0 ? <Empty title="No open work" /> : <Bars data={wp} />}</Card>
        )}
        {tc && !wide && (
          <Card title="Deadline performance" i={10}>
            {tc.onTime + tc.late === 0 ? <Empty title="No finished tasks with deadlines yet" /> : (
              <>
                <Progress pct={Math.round((tc.onTime / (tc.onTime + tc.late)) * 100)} />
                <p className="muted small" style={{ marginTop: 8 }}>{tc.onTime} on time, {tc.late} late, from {tc.onTime + tc.late} completed tasks with a deadline.</p>
              </>
            )}
          </Card>
        )}
        {tc && wide && we && (
          <Card title="Employee workload" i={9}>
            {we.length === 0 ? <Empty title="No assigned work yet" /> : (
              <ul className="ad-list">{we.map((w) => (
                <li key={w.id} style={{ display: 'grid', gap: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><b>{w.name}</b><span className="muted small">{w.open} open · {w.done} done</span></div>
                  <Progress pct={w.open + w.done ? Math.round((w.done / (w.open + w.done)) * 100) : 0} />
                </li>))}</ul>
            )}
          </Card>
        )}
        {qm && im && (
          <Card title="Quotation and invoice totals (6 months)" i={10}>
            <Bars data={qm} money />
            <p className="muted small" style={{ margin: '4px 0 10px' }}>Quotations (above) and invoices (below), by month created, in BDT.</p>
            <Bars data={im} money />
            <p className="muted small">Invoiced in the period: {bdt(im.reduce((a, b) => a + b.value, 0))}</p>
          </Card>
        )}
        {act && (
          <Card title="Recent activity" i={11}>
            {act.length === 0 ? <Empty title="No activity yet" /> : (
              <ul className="ad-timeline">{act.map((a) => (
                <li key={a.id}><Link href={`/admin/tasks/${a.taskId}`}><b>{a.title}</b></Link><br />
                  <span className="muted small">{a.who} · {a.kind === 'status' && a.to ? <StatusBadge s={a.to} /> : a.kind} · {when(a.at)}</span></li>))}</ul>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}

function greeting() {
  const h = Number(new Date().toLocaleString('en-GB', { hour: '2-digit', hour12: false, timeZone: 'Asia/Dhaka' }));
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

import { requireUser, can } from '@/server/auth';
import { q, q1 } from '@/server/db';
import { cancelLeaveAction, checkInAction, checkOutAction, correctAttendanceAction, decideLeaveAction, requestLeaveAction, setFingerprintAction } from '@/server/actions/attendance';
import { ActionButton, ActionForm } from '@/components/admin/Forms';
import { Card, Empty, StatusBadge, day } from '@/components/admin/Ui';

export const metadata = { title: 'Attendance' };

const hm = (d: string | null) => (d ? new Date(d).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Dhaka' }) : '-');
const TODAY = `(now() AT TIME ZONE 'Asia/Dhaka')::date`;

export default async function Attendance() {
  const u = await requireUser();
  const seeAll = can(u, 'hr.attendance_view') || can(u, 'hr.attendance_edit') || can(u, 'hr.leave_approve');
  const [mine, myMonth, myLeave] = await Promise.all([
    q1<{ check_in: string | null; check_out: string | null; source: string }>(`SELECT check_in, check_out, source FROM attendance WHERE user_id = $1 AND work_date = ${TODAY}`, [u.id]),
    q<{ work_date: string; check_in: string | null; check_out: string | null; source: string }>(`SELECT work_date::text, check_in, check_out, source FROM attendance WHERE user_id = $1 AND work_date >= (date_trunc('month', now() AT TIME ZONE 'Asia/Dhaka'))::date ORDER BY work_date DESC`, [u.id]),
    q<{ id: string; kind: string; from_on: string; to_on: string; status: string; reason: string | null }>(`SELECT id, kind, from_on::text, to_on::text, status, reason FROM leave_requests WHERE user_id = $1 ORDER BY from_on DESC LIMIT 15`, [u.id]),
  ]);
  const board = seeAll ? await q<{ id: string; name: string; fingerprint_id: string | null; check_in: string | null; check_out: string | null; source: string | null; days: string }>(
    `SELECT u.id, u.name, u.fingerprint_id, a.check_in, a.check_out, a.source,
            (SELECT count(*) FROM attendance m WHERE m.user_id = u.id AND m.check_in IS NOT NULL AND m.work_date >= (date_trunc('month', now() AT TIME ZONE 'Asia/Dhaka'))::date)::text AS days
     FROM users u LEFT JOIN attendance a ON a.user_id = u.id AND a.work_date = ${TODAY} WHERE u.status = 'active' ORDER BY u.name`) : [];
  const pending = can(u, 'hr.leave_approve') ? await q<{ id: string; name: string; kind: string; from_on: string; to_on: string; reason: string | null }>(
    `SELECT l.id, us.name, l.kind, l.from_on::text, l.to_on::text, l.reason FROM leave_requests l JOIN users us ON us.id = l.user_id WHERE l.status = 'pending' ORDER BY l.from_on`) : [];

  return (
    <div className="ad-grid ad-cols-2" style={{ alignItems: 'start' }}>
      <div className="ad-grid">
        <Card title="My day">
          <p style={{ margin: '0 0 10px' }}>Check-in <b>{hm(mine?.check_in ?? null)}</b> · Check-out <b>{hm(mine?.check_out ?? null)}</b>{mine && <> <span className="muted small">({mine.source})</span></>}</p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <ActionButton action={checkInAction} label="Check in" tone="primary" size="" />
            <ActionButton action={checkOutAction} label="Check out" size="" />
          </div>
        </Card>
        <Card title="This month">
          {myMonth.length === 0 ? <Empty title="No attendance yet this month" /> : (
            <table className="ad-table"><thead><tr><th>Date</th><th>In</th><th>Out</th><th>Source</th></tr></thead>
              <tbody>{myMonth.map((r) => <tr key={r.work_date}><td>{day(r.work_date)}</td><td>{hm(r.check_in)}</td><td>{hm(r.check_out)}</td><td>{r.source}</td></tr>)}</tbody></table>
          )}
        </Card>
        <Card title="Request leave">
          <ActionForm action={requestLeaveAction} submit="Send request" resetOnOk>
            <div className="ad-row">
              <div className="ad-field"><label htmlFor="lk">Type</label><select id="lk" name="kind" defaultValue="casual"><option value="casual">Casual</option><option value="sick">Sick</option><option value="annual">Annual</option><option value="unpaid">Unpaid</option></select></div>
              <div className="ad-field"><label htmlFor="lf">From</label><input id="lf" name="from_on" type="date" required /></div>
              <div className="ad-field"><label htmlFor="lt">To</label><input id="lt" name="to_on" type="date" required /></div>
            </div>
            <div className="ad-field"><label htmlFor="lr">Reason (optional)</label><input id="lr" name="reason" type="text" maxLength={500} /></div>
          </ActionForm>
          {myLeave.length > 0 && <ul className="ad-list" style={{ marginTop: 12 }}>{myLeave.map((l) => (
            <li key={l.id}><span>{l.kind} · {day(l.from_on)} to {day(l.to_on)}<br /><span className="muted small">{l.reason ?? ''}</span></span>
              <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}><StatusBadge s={l.status} label={l.status} />{l.status === 'pending' && <ActionButton action={cancelLeaveAction.bind(null, l.id)} label="Cancel" />}</span></li>))}</ul>}
        </Card>
      </div>

      {seeAll && (
        <div className="ad-grid">
          {pending.length > 0 && (
            <Card title="Leave waiting for a decision">
              <ul className="ad-list">{pending.map((l) => (
                <li key={l.id}><span><b>{l.name}</b> · {l.kind}<br /><span className="muted small">{day(l.from_on)} to {day(l.to_on)}{l.reason ? ` · ${l.reason}` : ''}</span></span>
                  <span style={{ display: 'flex', gap: 8 }}><ActionButton action={decideLeaveAction.bind(null, l.id, true)} label="Approve" tone="primary" /><ActionButton action={decideLeaveAction.bind(null, l.id, false)} label="Reject" tone="danger" /></span></li>))}</ul>
            </Card>
          )}
          <Card title="Today, all staff">
            <table className="ad-table"><thead><tr><th>Name</th><th>In</th><th>Out</th><th>Days this month</th><th>Finger ID</th></tr></thead>
              <tbody>{board.map((r) => <tr key={r.id}><td>{r.name}</td><td>{hm(r.check_in)}</td><td>{hm(r.check_out)}</td><td>{r.days}</td><td>{r.fingerprint_id ?? '-'}</td></tr>)}</tbody></table>
          </Card>
          {can(u, 'hr.attendance_edit') && (
            <>
              <Card title="Fingerprint ID">
                <p className="muted small" style={{ margin: '0 0 8px' }}>The number the fingerprint device uses for this person. Leave empty to remove it.</p>
                <ActionForm action={setFingerprintAction} submit="Save ID">
                  <div className="ad-row">
                    <div className="ad-field"><label htmlFor="fu">Employee</label><select id="fu" name="user_id" required defaultValue="">{[<option key="" value="" disabled>Choose…</option>, ...board.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)]}</select></div>
                    <div className="ad-field"><label htmlFor="ff">Fingerprint ID</label><input id="ff" name="fid" type="text" maxLength={30} /></div>
                  </div>
                </ActionForm>
              </Card>
              <Card title="Correct a day">
                <ActionForm action={correctAttendanceAction} submit="Save" resetOnOk>
                  <div className="ad-row">
                    <div className="ad-field"><label htmlFor="cu">Employee</label><select id="cu" name="user_id" required defaultValue="">{[<option key="" value="" disabled>Choose…</option>, ...board.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)]}</select></div>
                    <div className="ad-field"><label htmlFor="cd">Date</label><input id="cd" name="work_date" type="date" required /></div>
                  </div>
                  <div className="ad-row">
                    <div className="ad-field"><label htmlFor="ci">Check-in (HH:MM)</label><input id="ci" name="check_in" type="time" /></div>
                    <div className="ad-field"><label htmlFor="co">Check-out (HH:MM)</label><input id="co" name="check_out" type="time" /></div>
                  </div>
                  <div className="ad-field"><label htmlFor="cn">Note (optional)</label><input id="cn" name="note" type="text" maxLength={200} /></div>
                </ActionForm>
              </Card>
            </>
          )}
        </div>
      )}
    </div>
  );
}

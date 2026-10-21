import type { User } from '@/server/auth';

export interface Mgr { id: string; name: string }

/** Shared fields for creating and editing an employee. Positions and departments are free text on purpose (suggestions only). */
export function EmployeeFields({ v, managers }: { v?: Partial<User>; managers: Mgr[] }) {
  return (
    <>
      <div className="ad-row">
        <div className="ad-field"><label htmlFor="f-name">Full name</label><input id="f-name" name="name" type="text" required defaultValue={v?.name} autoComplete="off" /></div>
        <div className="ad-field"><label htmlFor="f-email">Email (login ID)</label><input id="f-email" name="email" type="email" required defaultValue={v?.email} autoComplete="off" /></div>
      </div>
      <div className="ad-row three">
        <div className="ad-field"><label htmlFor="f-phone">Phone number</label><input id="f-phone" name="phone" type="tel" defaultValue={v?.phone ?? ''} /></div>
        <div className="ad-field"><label htmlFor="f-code">Employee ID</label><input id="f-code" name="employee_code" type="text" defaultValue={v?.employeeCode ?? ''} /></div>
        <div className="ad-field"><label htmlFor="f-join">Joining date</label><input id="f-join" name="joined_on" type="date" defaultValue={v?.joinedOn ?? ''} /></div>
      </div>
      <div className="ad-row three">
        <div className="ad-field"><label htmlFor="f-pos">Position / designation</label><input id="f-pos" name="position" type="text" list="pos-list" defaultValue={v?.position ?? ''} placeholder="Type any position" />
          <datalist id="pos-list">{['Interior Designer', 'Architect', 'Project Manager', 'Site Engineer', 'Accountant', 'HR Executive', 'Sales Executive', 'Marketing Executive', 'Content Designer'].map((x) => <option key={x} value={x} />)}</datalist></div>
        <div className="ad-field"><label htmlFor="f-dep">Department</label><input id="f-dep" name="department" type="text" list="dep-list" defaultValue={v?.department ?? ''} placeholder="Type any department" />
          <datalist id="dep-list">{['Design', 'Projects', 'Site', 'Accounts', 'HR', 'Sales', 'Marketing', 'Content'].map((x) => <option key={x} value={x} />)}</datalist></div>
        <div className="ad-field"><label htmlFor="f-mgr">Reporting manager</label>
          <select id="f-mgr" name="manager_id" defaultValue={v?.managerId ?? ''}><option value="">None</option>{managers.filter((m) => m.id !== v?.id).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select></div>
      </div>
    </>
  );
}

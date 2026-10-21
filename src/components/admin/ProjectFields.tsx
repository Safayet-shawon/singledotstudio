export interface ProjectVals { name?: string; client_id?: string | null; type?: string | null; location?: string | null; description?: string | null; start_on?: string | null; due_on?: string | null; status?: string; budget?: string | null }

export function ProjectFields({ v, clients, showBudget }: { v?: ProjectVals; clients: { id: string; name: string }[]; showBudget: boolean }) {
  return (
    <>
      <div className="ad-row">
        <div className="ad-field"><label htmlFor="pn">Project name</label><input id="pn" name="name" type="text" required defaultValue={v?.name} /></div>
        <div className="ad-field"><label htmlFor="pc">Client</label><select id="pc" name="client_id" defaultValue={v?.client_id ?? ''}><option value="">No client yet</option>{clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
      </div>
      <div className="ad-row three">
        <div className="ad-field"><label htmlFor="pt">Project type</label><input id="pt" name="type" type="text" list="ptypes" defaultValue={v?.type ?? ''} placeholder="Any type" />
          <datalist id="ptypes">{['Residential Interior', 'Commercial Interior', 'Office Design', 'Restaurant Interior', 'Apartment Renovation', 'Retail Interior'].map((x) => <option key={x} value={x} />)}</datalist></div>
        <div className="ad-field"><label htmlFor="pl">Location</label><input id="pl" name="location" type="text" defaultValue={v?.location ?? ''} /></div>
        <div className="ad-field"><label htmlFor="ps">Status</label><select id="ps" name="status" defaultValue={v?.status ?? 'planning'}>{['planning', 'active', 'in_progress', 'on_hold', 'completed', 'cancelled'].map((x) => <option key={x} value={x}>{x.replace('_', ' ')}</option>)}</select></div>
      </div>
      <div className="ad-row three">
        <div className="ad-field"><label htmlFor="pa">Start date</label><input id="pa" name="start_on" type="date" defaultValue={v?.start_on?.slice(0, 10) ?? ''} /></div>
        <div className="ad-field"><label htmlFor="pd">Target completion</label><input id="pd" name="due_on" type="date" defaultValue={v?.due_on?.slice(0, 10) ?? ''} /></div>
        {showBudget && <div className="ad-field"><label htmlFor="pb">Budget (BDT)</label><input id="pb" name="budget" type="number" min="0" step="1" defaultValue={v?.budget ?? ''} /></div>}
      </div>
      <div className="ad-field"><label htmlFor="px">Description</label><textarea id="px" name="description" defaultValue={v?.description ?? ''} /></div>
    </>
  );
}

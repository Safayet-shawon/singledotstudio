export interface ClientVals { name?: string; company?: string | null; phone?: string | null; email?: string | null; address?: string | null; notes?: string | null; status?: string }

export function ClientFields({ v, contact }: { v?: ClientVals; contact: boolean }) {
  return (
    <>
      <div className="ad-row">
        <div className="ad-field"><label htmlFor="cn">Client name</label><input id="cn" name="name" type="text" required defaultValue={v?.name} /></div>
        <div className="ad-field"><label htmlFor="cc">Company</label><input id="cc" name="company" type="text" defaultValue={v?.company ?? ''} /></div>
      </div>
      {contact ? (
        <>
          <div className="ad-row">
            <div className="ad-field"><label htmlFor="cp">Phone</label><input id="cp" name="phone" type="tel" defaultValue={v?.phone ?? ''} /></div>
            <div className="ad-field"><label htmlFor="ce">Email</label><input id="ce" name="email" type="email" defaultValue={v?.email ?? ''} /></div>
          </div>
          <div className="ad-field"><label htmlFor="ca">Address</label><input id="ca" name="address" type="text" defaultValue={v?.address ?? ''} /></div>
        </>
      ) : <p className="muted small">Contact details are restricted for your account.</p>}
      <div className="ad-row">
        <div className="ad-field"><label htmlFor="cs">Status</label><select id="cs" name="status" defaultValue={v?.status ?? 'active'}><option value="active">Active</option><option value="prospect">Prospect</option><option value="inactive">Inactive</option></select></div>
      </div>
      <div className="ad-field"><label htmlFor="cm">Communication notes</label><textarea id="cm" name="notes" defaultValue={v?.notes ?? ''} /></div>
    </>
  );
}

import { requireUser, pageCan, can } from '@/server/auth';
import { q } from '@/server/db';
import { getCompany } from '@/server/settings';
import { mailConfigured } from '@/lib/mail';
import { requestTransferCodesAction, transferOwnershipAction } from '@/server/actions/employees';
import { saveCompanyAction } from '@/server/actions/finance';
import { ActionForm } from '@/components/admin/Forms';
import { Card } from '@/components/admin/Ui';

export const metadata = { title: 'Settings' };

export default async function Settings() {
  const u = await requireUser();
  pageCan(u, 'admin.settings');
  const co = await getCompany();
  const candidates = u.isOwner ? await q<{ id: string; name: string; email: string }>(`SELECT id, name, email FROM users WHERE status = 'active' AND NOT is_owner ORDER BY name`) : [];
  return (
    <div className="ad-grid" style={{ maxWidth: 900 }}>
      <Card title="Company details (used on every PDF)">
        <ActionForm action={saveCompanyAction} submit="Save company details">
          <div className="ad-row"><div className="ad-field"><label htmlFor="n">Company name</label><input id="n" name="name" type="text" defaultValue={co.name} /></div><div className="ad-field"><label htmlFor="t">Tagline</label><input id="t" name="tagline" type="text" defaultValue={co.tagline} /></div></div>
          <div className="ad-row three"><div className="ad-field"><label htmlFor="p">Phone</label><input id="p" name="phone" type="text" defaultValue={co.phone} /></div><div className="ad-field"><label htmlFor="e">Email</label><input id="e" name="email" type="text" defaultValue={co.email} /></div><div className="ad-field"><label htmlFor="w">Website</label><input id="w" name="website" type="text" defaultValue={co.website} /></div></div>
          <div className="ad-field"><label htmlFor="a">Address</label><input id="a" name="address" type="text" defaultValue={co.address} /></div>
          <div className="ad-field"><label htmlFor="b">Bank / payment details (printed on invoices)</label><textarea id="b" name="bank" defaultValue={co.bank} style={{ minHeight: 70 }} /></div>
          <div className="ad-row"><div className="ad-field"><label htmlFor="tl">Default tax label</label><input id="tl" name="taxLabel" type="text" defaultValue={co.taxLabel} /></div><div className="ad-field"><label htmlFor="tp">Default tax %</label><input id="tp" name="taxPercent" type="number" min="0" max="100" step="any" defaultValue={co.taxPercent} /></div></div>
          <div className="ad-field"><label htmlFor="pt">Default payment terms</label><textarea id="pt" name="defaultPaymentTerms" defaultValue={co.defaultPaymentTerms} style={{ minHeight: 70 }} /></div>
          <div className="ad-field"><label htmlFor="dt">Default terms and conditions</label><textarea id="dt" name="defaultTerms" defaultValue={co.defaultTerms} /></div>
        </ActionForm>
      </Card>

      <Card title="Email delivery"><p style={{ margin: 0 }}>{mailConfigured() ? 'Real email is configured. Quotation emails, invitations and document emails are sent through your provider.' : 'Real email is not configured. Invitations and documents cannot be emailed; the system shows manual links instead and never reports a send it could not confirm. Set SMTP_HOST, SMTP_USER, SMTP_PASS, MAIL_FROM and NOTIFY_TO in the hosting environment to enable it.'}</p></Card>

      {u.isOwner && (
        <Card title="Transfer ownership">
          <p className="ad-msg warn">This makes another person the Main Admin. You lose owner-level access, every session is signed out, and it is recorded in the audit log. It needs your password and two emailed codes: one sent to you and one sent to the new owner. It cannot be done from the permission editor.</p>
          {!mailConfigured() && <p className="ad-msg err">Email delivery is not configured, so the two verification codes cannot be sent. Ownership transfer stays locked until it is.</p>}
          {candidates.length === 0 ? <p className="muted">There is no other active account to transfer to.</p> : (
            <>
              <h3 style={{ marginTop: 8 }}>Step 1: send the two codes</h3>
              <ActionForm action={requestTransferCodesAction} submit="Email both codes" className="ad-form">
                <div className="ad-field"><label htmlFor="tc1">New owner (an active account)</label><select id="tc1" name="target" required>{candidates.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.email})</option>)}</select></div>
                <div className="ad-row">
                  <div className="ad-field"><label htmlFor="tc1e">New owner&apos;s email (receives code 2)</label><input id="tc1e" name="new_email" type="email" required autoComplete="off" /></div>
                  <div className="ad-field"><label htmlFor="tc1p">New owner&apos;s phone number</label><input id="tc1p" name="new_phone" type="tel" required autoComplete="off" /></div>
                </div>
              </ActionForm>
              <h3 style={{ marginTop: 18 }}>Step 2: confirm with both codes</h3>
              <ActionForm action={transferOwnershipAction} submit="Transfer ownership">
                <div className="ad-field"><label htmlFor="tc2">New owner</label><select id="tc2" name="target" required>{candidates.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.email})</option>)}</select></div>
                <div className="ad-row">
                  <div className="ad-field"><label htmlFor="tc4">Code 1 (sent to your email)</label><input id="tc4" name="owner_code" type="text" inputMode="numeric" autoComplete="one-time-code" required /></div>
                  <div className="ad-field"><label htmlFor="tc6">Code 2 (sent to the new owner)</label><input id="tc6" name="new_code" type="text" inputMode="numeric" autoComplete="off" required /></div>
                </div>
                <div className="ad-field"><label htmlFor="tc3">Your password</label><input id="tc3" name="password" type="password" autoComplete="current-password" required /></div>
                <div className="ad-field"><label htmlFor="tc5">Type TRANSFER OWNERSHIP to confirm</label><input id="tc5" name="phrase" type="text" autoComplete="off" required /></div>
              </ActionForm>
            </>
          )}
        </Card>
      )}
      {!can(u, 'admin.settings') && null}
    </div>
  );
}

import { requireUser, pageCan } from '@/server/auth';
import { listLeads, type LeadRecord } from '@/lib/leads';
import { Card, Empty, bdt, when } from '@/components/admin/Ui';

export const metadata = { title: 'Leads' };

function Row({ l }: { l: LeadRecord }) {
  const c = (l.contact ?? {}) as Record<string, string>;
  const mail = l.mail as { customer: string; customerPreview: string | null; teamPreview: string | null } | undefined;
  const e = l.estimate as { input?: { propertyType?: string; sqft?: number; bhk?: number; package?: string }; tier?: string; low?: number; high?: number; lines?: { label: string; qty: number }[]; extras?: { label: string }[] } | undefined;
  return (
    <details className="lead">
      <summary><span className="lead__ref">{l.reference}</span><span>{c.name}</span><span className={`lead__kind lead__kind--${l.kind}`}>{l.kind === 'quotation' ? 'Quotation' : 'Consultation'}</span><time>{when(l.at)}</time></summary>
      <div className="lead__body"><dl>
        <dt>Phone</dt><dd><a href={`tel:${c.phone}`}>{c.phone}</a></dd><dt>Email</dt><dd><a href={`mailto:${c.email}`}>{c.email}</a></dd>
        {c.address && <><dt>Address</dt><dd>{c.address}</dd></>}
        {e?.input && <><dt>Property</dt><dd>{e.input.propertyType}{e.input.propertyType !== 'office' ? `, ${e.input.bhk} BHK` : ''}, {e.input.sqft} sq ft</dd><dt>Package</dt><dd>{e.input.package}{e.input.package === 'bestfit' ? ` (recommended ${e.tier})` : ''}</dd>
          <dt>Estimate</dt><dd>{typeof e.low === 'number' ? `${bdt(e.low)} to ${bdt(e.high ?? 0)}` : '-'}</dd><dt>Spaces</dt><dd>{e.lines?.map((x) => `${x.label}${x.qty > 1 ? ` × ${x.qty}` : ''}`).join(', ')}{e.extras?.length ? `. Add-ons: ${e.extras.map((x) => x.label).join(', ')}` : ''}</dd></>}
        {mail && <><dt>Emails</dt><dd>{mail.customer === 'sent' ? 'Quotation emailed to the customer.' : mail.customer === 'sample' ? 'Sample mode (not delivered). ' : `Customer email: ${mail.customer}. `}{mail.customerPreview && <a href={mail.customerPreview} target="_blank" rel="noopener noreferrer">View customer email</a>}{mail.teamPreview && <> · <a href={mail.teamPreview} target="_blank" rel="noopener noreferrer">View studio alert</a></>}</dd></>}
        {l.kind === 'consultation' && <><dt>Segment</dt><dd>{String(l.segment ?? '-')}</dd><dt>Service</dt><dd>{String(l.service || '-')}</dd><dt>Budget</dt><dd>{String(l.budget || '-')}</dd><dt>Message</dt><dd>{String(l.message || '-')}</dd></>}
      </dl></div>
    </details>
  );
}

export default async function Leads() {
  const u = await requireUser();
  pageCan(u, 'admin.leads');
  const leads = await listLeads();
  return (
    <div className="ad-grid">
      <p className="muted" style={{ margin: 0 }}>{leads.length} request{leads.length === 1 ? '' : 's'} from the public website, newest first.</p>
      {leads.length === 0 ? <Card><Empty title="Nothing yet">New quotation and consultation requests appear here.</Empty></Card> : <div className="leads">{leads.map((l) => <Row key={l.reference + l.at} l={l} />)}</div>}
    </div>
  );
}

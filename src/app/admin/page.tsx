import type { Metadata } from 'next';
import { adminConfigured, isAdmin } from '@/lib/admin-auth';
import { listLeads, type LeadRecord } from '@/lib/leads';
import { AdminLogin, AdminLogout } from './AdminClient';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Admin', robots: { index: false, follow: false } };

const fmt = (iso: string) => new Date(iso).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Dhaka' });
const bdt = (n: unknown) => (typeof n === 'number' ? `৳${new Intl.NumberFormat('en-BD', { maximumFractionDigits: 0 }).format(n)}` : '-');

function Row({ l }: { l: LeadRecord }) {
  const c = (l.contact ?? {}) as Record<string, string>;
  const mail = l.mail as { customer: string; team: string; customerPreview: string | null; teamPreview: string | null } | undefined;
  const e = l.estimate as { input?: { propertyType?: string; sqft?: number; bhk?: number; package?: string }; tier?: string; low?: number; high?: number; lines?: { label: string; qty: number }[]; extras?: { label: string }[] } | undefined;
  return (
    <details className="lead">
      <summary>
        <span className="lead__ref">{l.reference}</span>
        <span className="lead__name">{c.name}</span>
        <span className={`lead__kind lead__kind--${l.kind}`}>{l.kind === 'quotation' ? 'Quotation' : 'Consultation'}</span>
        <time>{fmt(l.at)}</time>
      </summary>
      <div className="lead__body">
        <dl>
          <dt>Phone</dt><dd><a href={`tel:${c.phone}`}>{c.phone}</a></dd>
          <dt>Email</dt><dd><a href={`mailto:${c.email}`}>{c.email}</a></dd>
          {c.address && <><dt>Address</dt><dd>{c.address}</dd></>}
          {e?.input && <>
            <dt>Property</dt><dd>{e.input.propertyType}{e.input.propertyType !== 'office' ? `, ${e.input.bhk} BHK` : ''}, {e.input.sqft} sq ft</dd>
            <dt>Package</dt><dd>{e.input.package}{e.input.package === 'bestfit' ? ` (recommended ${e.tier})` : ''}</dd>
            <dt>Estimate</dt><dd>{bdt(e.low)} to {bdt(e.high)}</dd>
            <dt>Spaces</dt><dd>{e.lines?.map((x) => `${x.label}${x.qty > 1 ? ` × ${x.qty}` : ''}`).join(', ')}{e.extras?.length ? `. Add-ons: ${e.extras.map((x) => x.label).join(', ')}` : ''}</dd>
          </>}
          {mail && <>
            <dt>Emails</dt>
            <dd>
              {mail.customer === 'sent' ? 'Quotation emailed to customer; studio copy sent.' : mail.customer === 'sample' ? 'Sample mode (not delivered). ' : `Customer email: ${mail.customer}. `}
              {mail.customerPreview && <a href={mail.customerPreview} target="_blank" rel="noopener noreferrer">View customer email</a>}
              {mail.teamPreview && <> · <a href={mail.teamPreview} target="_blank" rel="noopener noreferrer">View studio alert</a></>}
            </dd>
          </>}
          {l.kind === 'consultation' && <>
            <dt>Segment</dt><dd>{String(l.segment ?? '-')}</dd>
            <dt>Service</dt><dd>{String(l.service || '-')}</dd>
            <dt>Budget</dt><dd>{String(l.budget || '-')}</dd>
            <dt>Message</dt><dd>{String(l.message || '-')}</dd>
          </>}
        </dl>
      </div>
    </details>
  );
}

export default async function AdminPage() {
  if (!adminConfigured()) return <div className="container admin"><h1>Admin</h1><p className="notice notice--warn">Set the ADMIN_PASSWORD environment variable (8+ characters) to enable this panel.</p></div>;
  if (!(await isAdmin())) return <div className="container admin"><h1>Admin</h1><AdminLogin /></div>;
  const leads = await listLeads();
  return (
    <div className="container admin">
      <div className="admin__top"><h1>Quotation requests</h1><AdminLogout /></div>
      <p className="hint">{leads.length} request{leads.length === 1 ? '' : 's'}, newest first. A copy of every quotation email also goes to the studio inbox.</p>
      {leads.length === 0 ? <p className="notice">Nothing yet. New requests appear here automatically.</p> : <div className="leads">{leads.map((l) => <Row key={l.reference + l.at} l={l} />)}</div>}
    </div>
  );
}

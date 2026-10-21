import type { Metadata } from 'next';
import { PageHead } from '@/components/sections';
import { site } from '@/config/site';

export const metadata: Metadata = { title: 'Privacy Policy', alternates: { canonical: '/privacy' }, robots: { index: true } };

export default function Privacy() {
  return (
    <>
      <PageHead eyebrow="Legal" title="Privacy Policy" />
      <div className="container prose" style={{ paddingBottom: 'var(--section)' }}>
        <p className="notice notice--warn">Draft template. Have it reviewed by a qualified professional and completed with {site.brand.name}’s real details before launch.</p>
        <h2>What we collect</h2>
        <p>When you use the consultation form or the budget calculator we collect the details you enter: name, phone number, email address, project address or location, property details, selected spaces and package, and any message you add.</p>
        <h2>How we use it</h2>
        <p>We use these details to respond to your enquiry, prepare and send your estimate, and discuss your project. We do not sell your data.</p>
        <h2>Browser storage</h2>
        <p>The calculator saves your in-progress answers and whether you have dismissed or completed its prompt in your browser’s local storage, so it does not reappear repeatedly. You can clear this at any time in your browser settings.</p>
        <h2>Service providers</h2>
        <p>Email delivery and hosting are handled by third-party providers acting on our behalf. [Placeholder: list the providers actually used.]</p>
        <h2>Retention and your rights</h2>
        <p>[Placeholder: state how long enquiries are kept and how to request access, correction or deletion.]</p>
        <h2>Contact</h2>
        <p>{site.contact.email ?? '[Contact email to be added]'}</p>
      </div>
    </>
  );
}

import type { Metadata } from 'next';
import { PageHead } from '@/components/sections';
import { site } from '@/config/site';

export const metadata: Metadata = { title: 'Terms and Conditions', alternates: { canonical: '/terms' } };

export default function Terms() {
  return (
    <>
      <PageHead eyebrow="Legal" title="Terms and Conditions" />
      <div className="container prose" style={{ paddingBottom: 'var(--section)' }}>
        <p className="notice notice--warn">Draft template. Have it reviewed by a qualified professional and completed with {site.brand.name}’s real details before launch.</p>
        <h2>Estimates</h2>
        <p>Budget estimates produced by the calculator are indicative ranges based on the information you provide and a simplified model. They are not quotations, offers or contracts. Final pricing is confirmed in writing after consultation and site assessment.</p>
        <h2>Website content</h2>
        <p>Projects shown may be concept designs. Imagery and descriptions are illustrative unless stated otherwise.</p>
        <h2>Use of the site</h2>
        <p>You agree not to misuse the site, including by submitting false information or attempting to disrupt its operation.</p>
        <h2>Liability</h2>
        <p>[Placeholder: limitation of liability, governing law and jurisdiction.]</p>
      </div>
    </>
  );
}

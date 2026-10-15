import type { Metadata } from 'next';
import { ConsultSection, PageHead } from '@/components/sections';

export const metadata: Metadata = {
  title: 'Contact & Book a Consultation',
  description: 'Book a design consultation for your home or office.',
  alternates: { canonical: '/contact' },
};

export default function ContactPage() {
  return (
    <>
      <PageHead eyebrow="Contact" title="Let’s talk about your space" />
      <div style={{ marginTop: -40 }}><ConsultSection /></div>
    </>
  );
}

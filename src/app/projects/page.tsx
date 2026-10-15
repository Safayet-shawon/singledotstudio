import type { Metadata } from 'next';
import { PageHead, ConsultSection, GallerySection } from '@/components/sections';

export const metadata: Metadata = {
  title: 'Projects',
  description: 'Concept interior designs across homes and offices.',
  alternates: { canonical: '/projects' },
};

export default function ProjectsPage() {
  return (
    <>
      <PageHead eyebrow="Portfolio" title="Our projects" lede="Filter by space. All projects shown are concept designs until real projects are approved for publishing." />
      <div style={{ marginTop: -60 }}><GallerySection heading="Browse by category" /></div>
      <ConsultSection />
    </>
  );
}

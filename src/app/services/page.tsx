import type { Metadata } from 'next';
import { Hero } from '@/components/Hero';
import { ConsultSection, CtaBand, ServicesSection } from '@/components/sections';

export const metadata: Metadata = {
  title: 'Interior Design Services',
  description: 'Kitchen, bedroom, bathroom, living and dining, and office interior design services.',
  alternates: { canonical: '/services' },
};

export default function ServicesPage() {
  return (
    <>
      <Hero slot="services" compact>
        <span className="eyebrow" style={{ color: 'var(--sand)' }}>Our services</span>
        <h1>Every space, considered</h1>
        <p className="hero__sub">From a single kitchen to a complete home or office, each service has its own approach, materials and indicative costs.</p>
      </Hero>
      <ServicesSection />
      <CtaBand title="Not sure where to start?" />
      <ConsultSection />
    </>
  );
}

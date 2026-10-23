import type { Metadata } from 'next';
import { Hero } from '@/components/Hero';
import { JsonLd } from '@/components/JsonLd';
import { Reveal } from '@/components/Reveal';
import { SITE_FAQ, breadcrumbLd, faqLd } from '@/lib/seo';
import { ConsultSection, CtaBand, ServicesSection } from '@/components/sections';

export const metadata: Metadata = {
  title: 'Interior Design Services',
  description: 'Kitchen, bedroom, bathroom, living and dining, and office interior design services.',
  alternates: { canonical: '/services' },
};

export default function ServicesPage() {
  return (
    <>
      <JsonLd data={[breadcrumbLd([['Home', '/'], ['Services', '/services']]), faqLd(SITE_FAQ)]} />
      <Hero slot="services" compact>
        <span className="eyebrow" style={{ color: 'var(--sand)' }}>Our services</span>
        <h1>Every space, considered</h1>
        <p className="hero__sub">From a single kitchen to a complete home or office, each service has its own approach, materials and indicative costs.</p>
      </Hero>
      <ServicesSection />
      <section className="section" aria-labelledby="qa-h">
        <div className="container split">
          <Reveal><span className="eyebrow">Quick answers</span><h2 id="qa-h">Common questions</h2></Reveal>
          <Reveal>{SITE_FAQ.map((f) => <details key={f.q}><summary>{f.q}</summary><p>{f.a}</p></details>)}</Reveal>
        </div>
      </section>
      <CtaBand title="Not sure where to start?" />
      <ConsultSection />
    </>
  );
}

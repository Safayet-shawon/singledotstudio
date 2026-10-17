import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Hero } from '@/components/Hero';
import { Icon } from '@/components/Icon';
import { Photo } from '@/components/Photo';
import { Reveal } from '@/components/Reveal';
import { OpenBudgetButton } from '@/components/BudgetProvider';
import { ConsultSection, CostTable, CtaBand, GallerySection } from '@/components/sections';
import { serviceBySlug, services, site } from '@/config/site';

export const dynamicParams = false;
export const generateStaticParams = () => services.map((s) => ({ slug: s.slug }));

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const s = serviceBySlug((await params).slug);
  if (!s) return {};
  return { title: `${s.name} Interior Design`, description: s.intro, alternates: { canonical: `/services/${s.slug}` }, openGraph: { title: `${s.name} Interior Design | ${site.brand.name}`, description: s.intro } };
}

export default async function ServicePage({ params }: { params: Promise<{ slug: string }> }) {
  const s = serviceBySlug((await params).slug);
  if (!s) notFound();
  const jsonLd = { '@context': 'https://schema.org', '@type': 'Service', name: `${s.name} interior design`, description: s.intro, provider: { '@type': 'Organization', name: site.brand.name } };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Hero slot={s.videoSlot} compact>
        <span className="eyebrow" style={{ color: 'var(--sand)' }}>{s.audience === 'office' ? 'Office interiors' : 'Home interiors'}</span>
        <h1>{s.name} interior design</h1>
        <p className="hero__sub">{s.intro}</p>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 24 }}>
          <Link className="btn btn--light" href="#consultation">Book a consultation</Link>
        </div>
      </Hero>

      <section className="section" aria-labelledby="approach-h">
        <div className="container split">
          <Reveal>
            <span className="eyebrow">Design approach</span>
            <h2 id="approach-h" style={{ marginBottom: 24 }}>How we approach the {s.name.toLowerCase()}</h2>
            {s.approach.map((p) => <p key={p} className="lede">{p}</p>)}
            {s.officeAreas && (
              <>
                <h3 style={{ margin: '28px 0 12px' }}>Areas we design</h3>
                <div className="areas" style={{ marginTop: 0 }}>{s.officeAreas.map((a) => <span key={a} className="chip">{a}</span>)}</div>
              </>
            )}
          </Reveal>
          <Reveal><div className="portrait" style={{ aspectRatio: '4/3' }}><Photo slot={`service-${s.slug}-detail`} alt={`${s.name} design detail`} label={`${s.slug} detail`} /></div></Reveal>
        </div>
        <div className="container" style={{ marginTop: 'clamp(28px, 4vw, 48px)' }}>
          <Reveal className="facts">
            <div><h3>Materials & finishes</h3><ul>{s.materials.map((x) => <li key={x}>{x}</li>)}</ul></div>
            <div><h3>Lighting</h3><ul>{s.lighting.map((x) => <li key={x}>{x}</li>)}</ul></div>
            <div><h3>Space planning</h3><ul>{s.planning.map((x) => <li key={x}>{x}</li>)}</ul></div>
            <div>
              <h3>Plan your budget</h3>
              <p className="hint">Use the four-step calculator for a personalised indicative estimate.</p>
              <OpenBudgetButton className="btn"><Icon name="calc" size={16} /> Calculate your budget</OpenBudgetButton>
            </div>
          </Reveal>
        </div>
      </section>

      <GallerySection service={s.slug} heading={`Recent ${s.name.toLowerCase()} concepts`} />
      <CostTable service={s} />

      <section className="section" aria-labelledby="faq-h">
        <div className="container split">
          <Reveal><span className="eyebrow">FAQs</span><h2 id="faq-h">Questions about {s.name.toLowerCase()} design</h2></Reveal>
          <Reveal>{s.faqs.map((f) => <details key={f.q}><summary>{f.q}</summary><p>{f.a}</p></details>)}</Reveal>
        </div>
      </section>

      <section className="section section--cream" aria-labelledby="rel-h">
        <div className="container">
          <Reveal className="section-head"><span className="eyebrow">Related services</span><h2 id="rel-h">Continue exploring</h2></Reveal>
          <div className="areas" style={{ marginTop: 0 }}>
            {s.related.map((r) => { const rs = serviceBySlug(r)!; return <Link key={r} className="chip" href={`/services/${r}`}>{rs.name} →</Link>; })}
          </div>
        </div>
      </section>

      <CtaBand title="Let’s plan your space" />
      <ConsultSection defaultService={s.slug} />
    </>
  );
}

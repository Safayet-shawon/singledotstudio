import type { Metadata } from 'next';
import { Hero } from '@/components/Hero';
import { Photo } from '@/components/Photo';
import { Reveal } from '@/components/Reveal';
import { ConsultSection, OwnerQuote, StatsSection, WhySection } from '@/components/sections';
import { processSteps as steps, values } from '@/config/site';

export const metadata: Metadata = {
  title: 'About the Studio',
  description: 'Our design philosophy, process and values.',
  alternates: { canonical: '/about' },
};

export default function AboutPage() {
  return (
    <>
      <Hero slot="about" compact>
        <span className="eyebrow" style={{ color: 'var(--sand)' }}>About us</span>
        <h1>Design that feels considered, not decorated</h1>
      </Hero>

      <section className="section" aria-labelledby="phil-h">
        <div className="container split">
          <Reveal>
            <span className="eyebrow">Philosophy</span>
            <h2 id="phil-h">Calm spaces, honest materials</h2>
            <p className="lede" style={{ marginTop: 20 }}>We design interiors that are quiet, warm and made to be lived in: natural materials, careful proportions and light handled with restraint.</p>
            <p className="hint">[Placeholder: add the studio’s own story, founding year and team here. Nothing about the studio’s history is stated until you supply it.]</p>
          </Reveal>
          <Reveal><div className="portrait" style={{ aspectRatio: '4/3' }}><Photo slot="about-studio" alt="The studio at work" label="studio imagery" /></div></Reveal>
        </div>
      </section>

      <section className="section section--cream" aria-labelledby="proc-h">
        <div className="container">
          <Reveal className="section-head"><span className="eyebrow">Our process</span><h2 id="proc-h">From first conversation to handover</h2></Reveal>
          <ol className="process" style={{ padding: 0 }}>
            {steps.map((s) => <li key={s.title}><h3>{s.title}</h3><p>{s.text}</p></li>)}
          </ol>
        </div>
      </section>

      <section className="section" aria-labelledby="val-h">
        <div className="container">
          <Reveal className="section-head"><span className="eyebrow">Values</span><h2 id="val-h">What guides our work</h2></Reveal>
          <div className="values">{values.map((v) => <Reveal key={v.title}><h3 style={{ marginBottom: 8 }}>{v.title}</h3><p className="hint" style={{ fontSize: '1rem' }}>{v.text}</p></Reveal>)}</div>
        </div>
      </section>

      <OwnerQuote />
      <StatsSection />
      <WhySection />
      <ConsultSection />
    </>
  );
}

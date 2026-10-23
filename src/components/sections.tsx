import Link from 'next/link';
import { Photo } from './Photo';
import { Icon } from './Icon';
import { Reveal } from './Reveal';
import { ProjectGallery, type GalleryCard } from './Marquee';
import { ServicesSwitcher, type ServiceCard } from './ServicesSwitcher';
import { ConsultationForm } from './ConsultationForm';
import { Stats } from './Stats';
import { OpenBudgetButton } from './BudgetProvider';
import { services, site, whyUs, type Project, type Service } from '@/config/site';
import { getContent } from '@/server/cms';
import { formatMoney } from '@/lib/estimate';
import { pricing } from '@/lib/pricing';

export function ProjectCard({ p }: { p: Project }) {
  return (
    <Link href={`/projects/${p.slug}`} className="proj" draggable={false}>
      <div className="media"><Photo slot={p.image} alt={`${p.title}, concept interior`} sizes="(max-width: 820px) 80vw, 420px" /></div>
      <div className="proj__body">
        <span className="badge">{p.status === 'concept' ? 'Concept design' : 'Completed project'}</span>
        <h3>{p.title}</h3>
        <span className="proj__meta">{p.category.replace('-', ' & ')}{p.location ? ` · ${p.location}` : ''}</span>
      </div>
    </Link>
  );
}

export async function GallerySection({ service, heading = 'Our projects' }: { service?: string; heading?: string }) {
  const projects = (await getContent()).portfolio;
  const list = service ? projects.filter((p) => p.service === service) : projects;
  const cards: GalleryCard[] = list.map((p) => ({ id: p.slug, category: p.category, node: <ProjectCard p={p} /> }));
  return (
    <section className="section" id="projects" aria-labelledby="gal-h">
      <div className="container">
        <Reveal className="section-head section-head--split">
          <div><span className="eyebrow">Selected work</span><h2 id="gal-h">{heading}</h2></div>
          <div>
            <p className="lede">Concept designs that show our direction. They are not completed client projects; real projects will replace them as they are approved for publishing.</p>
            <Link className="link-arrow" href="/projects">View all projects <Icon name="arrow" size={16} /></Link>
          </div>
        </Reveal>
        <ProjectGallery cards={cards} filters={!service} />
      </div>
    </section>
  );
}

function ServiceCardNode({ s, i, intro }: { s: Service; i: number; intro: string }) {
  return (
    <Link href={`/services/${s.slug}`} className="svc">
      <div className="media"><Photo slot={`service-${s.slug}`} alt={`${s.name} interior design`} sizes={i < 2 ? '(max-width: 820px) 100vw, 50vw' : '(max-width: 820px) 100vw, 33vw'} /></div>
      <div className="svc__body">
        <h3>{s.name}</h3>
        <p>{intro}</p>
        <span className="more">Explore {s.short.toLowerCase()} →</span>
      </div>
    </Link>
  );
}

export async function ServicesSection() {
  const intros = (await getContent()).services;
  const home = services.filter((s) => s.audience === 'home');
  const cards: ServiceCard[] = [
    ...home.map((s, i) => ({ slug: s.slug, audience: 'home' as const, node: <ServiceCardNode s={s} i={i} intro={intros[s.slug]?.intro ?? s.intro} /> })),
    ...services.filter((s) => s.audience === 'office').map((s, i) => ({ slug: s.slug, audience: 'office' as const, node: <ServiceCardNode s={s} i={i} intro={intros[s.slug]?.intro ?? s.intro} /> })),
    ...services.filter((s) => s.audience === 'showroom').map((s, i) => ({ slug: s.slug, audience: 'showroom' as const, node: <ServiceCardNode s={s} i={i} intro={intros[s.slug]?.intro ?? s.intro} /> })),
  ];
  const office = services.find((s) => s.slug === 'office')!;
  const showroom = services.find((s) => s.slug === 'showroom')!;
  return (
    <section className="section section--cream" id="services" aria-labelledby="svc-h">
      <div className="container">
        <Reveal className="section-head">
          <span className="eyebrow">What we design</span>
          <h2 id="svc-h">Interiors for the way you live and work</h2>
          <p className="lede">Choose Home, Office or Showroom to see the spaces we design, each with its own page.</p>
        </Reveal>
        <ServicesSwitcher cards={cards} officeAreas={office.officeAreas ?? []} showroomAreas={showroom.showroomAreas ?? []} />
      </div>
    </section>
  );
}

export async function OwnerQuote() {
  const o = (await getContent()).founder;
  return (
    <section className="section" aria-label="Founder’s note">
      <div className="container">
        <Reveal>
          <figure className="owner-card">
            <div className="owner-card__photo">
              <Photo slot="owner-portrait" alt={`Portrait of ${o.name}`} label="owner portrait" sizes="(max-width: 820px) 80vw, 380px" />
              <span className="owner-card__badge">Founder</span>
            </div>
            <div className="owner-card__body">
              <span className="owner-card__mark" aria-hidden="true">“</span>
              <span className="eyebrow">A word from the founder</span>
              <blockquote>{o.quote}</blockquote>
              <figcaption className="owner-card__who">
                <span className="owner-card__line" aria-hidden="true" />
                <span className="owner__name">{o.name}</span>
                <span className="owner__title">{o.title}</span>
              </figcaption>
            </div>
          </figure>
        </Reveal>
      </div>
    </section>
  );
}

export async function StatsSection() {
  const st = (await getContent()).stats;
  const stats = site.stats.map((x) => ({ ...x, value: (st as Record<string, number | null>)[x.key] ?? null }));
  return (
    <section className="section section--dark" aria-label="Studio in numbers">
      <div className="container">
        <Reveal><Stats stats={stats} /></Reveal>
      </div>
    </section>
  );
}

export function WhySection() {
  return (
    <section className="section" aria-labelledby="why-h">
      <div className="container why">
        <div className="why__image"><Photo slot="why-us" alt="Design studio materials and drawings" label="why choose us" sizes="(max-width: 820px) 100vw, 45vw" /></div>
        <div>
          <Reveal className="section-head"><span className="eyebrow">Why choose us</span><h2 id="why-h">Considered design, clearly managed</h2></Reveal>
          <div className="why__list">
            {whyUs.map((w, i) => (
              <Reveal key={w.title} className="why__item" delay={i * 80}>
                <span className="icon-ring"><Icon name={w.icon} size={24} /></span>
                <div><h3>{w.title}</h3><p>{w.text}</p></div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

const tbd = (v: string | null, label: string) => (v ? v : <span className="tbd">[{label} to be added]</span>);

export async function ConsultSection({ defaultService, id = 'consultation' }: { defaultService?: string; id?: string }) {
  const raw = (await getContent()).contact;
  const c = { phone: raw.phone || null, email: raw.email || null, address: raw.address || null };
  return (
    <section className="section section--cream" id={id} aria-labelledby="consult-h">
      <div className="container consult">
        <Reveal>
          <span className="eyebrow">Get in touch</span>
          <h2 id="consult-h">Book a consultation</h2>
          <p className="lede" style={{ marginTop: 16 }}>Tell us about your home, office or showroom. We will respond to discuss your space, scope and budget. Not ready yet? Try the budget calculator first.</p>
          <ul className="contact-list">
            <li><span>Phone</span>{tbd(c.phone, 'Phone')}</li>
            <li><span>Email</span>{tbd(c.email, 'Email')}</li>
            <li><span>Studio</span>{tbd(c.address, 'Address')}</li>
          </ul>
          <div style={{ marginTop: 28 }}><OpenBudgetButton className="link-arrow"><Icon name="calc" size={16} /> Calculate your budget</OpenBudgetButton></div>
        </Reveal>
        <Reveal><ConsultationForm defaultService={defaultService} /></Reveal>
      </div>
    </section>
  );
}

export function CostTable({ service }: { service: Service }) {
  const rows = service.costKeys.map((k) => pricing.items.find((i) => i.key === k)).filter(Boolean) as typeof pricing.items;
  const unit = (basis: string) => (basis === 'unit' ? 'per unit' : 'per sq ft');
  return (
    <section className="section section--cream" aria-labelledby="cost-h">
      <div className="container">
        <Reveal className="section-head section-head--split">
          <div><span className="eyebrow">Indicative costs</span><h2 id="cost-h">What {service.name.toLowerCase()} design may cost</h2></div>
          <p className="lede">Indicative ranges in {pricing.currency.code}. {pricing.placeholder ? 'These are placeholder rates until the studio confirms its pricing. ' : ''}Not a quotation.</p>
        </Reveal>
        <div className="table-wrap" tabIndex={0} role="region" aria-label="Indicative cost table">
          <table>
            <thead><tr><th>Item</th><th>Basis</th><th>Essential</th><th>Premium</th><th>Luxury</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.key}><td>{r.label}</td><td>{unit(r.basis)}</td><td>{formatMoney(r.rates.essential, pricing)}</td><td>{formatMoney(r.rates.premium, pricing)}</td><td>{formatMoney(r.rates.luxury, pricing)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="split" style={{ marginTop: 40 }}>
          <div><h3 style={{ marginBottom: 12 }}>Assumptions</h3><ul className="plain-list">{pricing.assumptions.map((a) => <li key={a}>{a}</li>)}</ul></div>
          <div><h3 style={{ marginBottom: 12 }}>What affects the final budget</h3><ul className="plain-list">{service.factors.map((a) => <li key={a}>{a}</li>)}</ul></div>
        </div>
      </div>
    </section>
  );
}

export function CtaBand({ title = 'Ready to begin?' }: { title?: string }) {
  return (
    <section className="section" aria-label="Next steps">
      <div className="container cta-band">
        <Reveal><h2>{title}</h2></Reveal>
        <div className="row">
          <Link className="btn btn--solid" href="/contact">Book a consultation</Link>
          <OpenBudgetButton className="btn"><Icon name="calc" size={16} /> Calculate your budget</OpenBudgetButton>
        </div>
      </div>
    </section>
  );
}

export function PageHead({ eyebrow, title, lede }: { eyebrow: string; title: string; lede?: string }) {
  return (
    <div className="container page-head">
      <span className="eyebrow">{eyebrow}</span>
      <h1 style={{ maxWidth: '16ch' }}>{title}</h1>
      {lede && <p className="lede" style={{ marginTop: 20 }}>{lede}</p>}
    </div>
  );
}

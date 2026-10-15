import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Photo } from '@/components/Photo';
import { Reveal } from '@/components/Reveal';
import { Icon } from '@/components/Icon';
import { OpenBudgetButton } from '@/components/BudgetProvider';
import { ConsultSection } from '@/components/sections';
import { projects, serviceBySlug } from '@/config/site';

export const dynamicParams = false;
export const generateStaticParams = () => projects.map((p) => ({ slug: p.slug }));

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const p = projects.find((x) => x.slug === slug);
  if (!p) return {};
  return { title: p.title, description: p.narrative, alternates: { canonical: `/projects/${p.slug}` } };
}

export default async function ProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = projects.find((x) => x.slug === slug);
  if (!p) notFound();
  const svc = serviceBySlug(p.service)!;
  return (
    <>
      <div className="container page-head">
        <Link href="/projects" className="link-arrow" style={{ marginBottom: 28 }}>← All projects</Link>
        <span className="eyebrow" style={{ marginTop: 24 }}>{p.status === 'concept' ? 'Concept design, not a completed client project' : 'Completed project'} · {p.category.replace('-', ' & ')}</span>
        <h1>{p.title}</h1>
        <p className="lede" style={{ marginTop: 16 }}>Location: {p.location ?? 'not specified'}</p>
      </div>
      <div className="container">
        <div className="portrait" style={{ aspectRatio: '16/9' }}><Photo slot={p.image} alt={`${p.title}, concept interior`} sizes="100vw" priority /></div>
      </div>
      <section className="section">
        <div className="container split">
          <Reveal>
            <span className="eyebrow">Design narrative</span>
            <p className="lede">{p.narrative}</p>
          </Reveal>
          <Reveal className="facts" >
            <div><h3>Materials & finishes</h3><ul>{p.materials.map((m) => <li key={m}>{m}</li>)}</ul></div>
            <div><h3>Scope of work</h3><ul>{p.scope.map((m) => <li key={m}>{m}</li>)}</ul></div>
            <div><h3>Related service</h3><Link className="link-arrow" href={`/services/${svc.slug}`}>{svc.name} <Icon name="arrow" size={16} /></Link></div>
            <div><h3>Budget</h3><OpenBudgetButton className="btn"><Icon name="calc" size={16} /> Calculate your budget</OpenBudgetButton></div>
          </Reveal>
        </div>
      </section>
      <ConsultSection defaultService={svc.slug} />
    </>
  );
}

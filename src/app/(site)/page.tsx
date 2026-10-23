import Link from 'next/link';
import { Hero } from '@/components/Hero';
import { JsonLd } from '@/components/JsonLd';
import { organizationLd } from '@/lib/seo';
import { Icon } from '@/components/Icon';
import { ConsultSection, GallerySection, ServicesSection, StatsSection, WhySection } from '@/components/sections';
import { getContent } from '@/server/cms';

export default async function Home() {
  const c = await getContent();
  return (
    <>
      <JsonLd data={organizationLd()} />
      <Hero
        slot="home"
        slides={c.hero.slides}
        aside={<div className="hero__budget"><p>{c.hero.budgetQuote}</p></div>}
      >
        <h1 className="hero__quote">{c.hero.quote}</h1>
        <Link className="btn btn--light" href="/about">Explore Us <Icon name="arrow" size={16} /></Link>
      </Hero>
      <ServicesSection />
      <GallerySection />
      <StatsSection />
      <WhySection />
      <ConsultSection />
    </>
  );
}

import Link from 'next/link';
import { Hero } from '@/components/Hero';
import { Icon } from '@/components/Icon';
import { ConsultSection, GallerySection, OwnerQuote, ServicesSection, StatsSection, WhySection } from '@/components/sections';
import { site } from '@/config/site';

export default function Home() {
  return (
    <>
      <Hero
        slot="home"
        aside={<div className="hero__budget"><p>{site.budgetQuote}</p></div>}
      >
        <h1 className="hero__quote">{site.heroQuote}</h1>
        <Link className="btn btn--light" href="/about">Explore Us <Icon name="arrow" size={16} /></Link>
      </Hero>
      <OwnerQuote />
      <ServicesSection />
      <GallerySection />
      <StatsSection />
      <WhySection />
      <ConsultSection />
    </>
  );
}

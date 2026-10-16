'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import CircularCarousel, { type CircularCarouselItem } from './reactbits/CircularCarousel';
import { Reveal } from './Reveal';
import { services } from '@/config/site';
import './FeaturedSpaces.css';

/** Landing-page 3D ring (React Bits CircularCarousel) of the studio's service imagery. Cards link to the service pages. */
const items: (CircularCarouselItem & { slug: string })[] = [
  ...services.map((s) => ({ slug: s.slug, src: `/media/img/service-${s.slug}.jpg`, alt: `${s.name} interior`, title: s.name, subtitle: 'Interior design' })),
  ...services.map((s) => ({ slug: s.slug, src: `/media/img/service-${s.slug}-detail.jpg`, alt: `${s.name} design detail`, title: `${s.name} detail`, subtitle: 'Finishes and layout' })),
];

export function FeaturedSpaces() {
  const router = useRouter();
  const [cardWidth, setCardWidth] = useState(320);
  useEffect(() => {
    const fit = () => setCardWidth(window.innerWidth < 560 ? 200 : window.innerWidth < 900 ? 260 : 320);
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);
  return (
    <section className="section section--cream spaces-ring" aria-labelledby="ring-h">
      <div className="container">
        <Reveal className="section-head">
          <span className="eyebrow">Spaces we design</span>
          <h2 id="ring-h">A look around the studio’s rooms</h2>
          <p className="lede">Drag, scroll or use the arrow keys to turn the ring. Select a card to open that service. These are stand-in photographs; our own projects will replace them.</p>
        </Reveal>
      </div>
      <div className="spaces-ring__stage">
        <CircularCarousel
          items={items}
          preset="cylinder"
          intro="rise"
          autoplay="drift"
          speed={9}
          cardWidth={cardWidth}
          aspectRatio={0.8}
          pauseOnHover
          focusOnClick
          fadeColor="#efe8da"
          cornerRadius={4}
          captions
          onItemClick={(_, i) => router.push(`/services/${items[i].slug}`)}
        />
      </div>
    </section>
  );
}

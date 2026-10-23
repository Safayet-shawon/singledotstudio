'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import CircularCarousel from './reactbits/CircularCarousel';
import { categoryFilters, type ProjectCategory } from '@/config/site';
import './ProjectRing.css';

export interface RingProject { slug: string; category: ProjectCategory; src: string; alt: string; title: string; subtitle: string }

/** Our Projects 3D ring (React Bits CircularCarousel) with the same category filters as before. Cards open the project page. */
export function ProjectRing({ projects, filters = true }: { projects: RingProject[]; filters?: boolean }) {
  const router = useRouter();
  const [filter, setFilter] = useState<string>('all');
  const [cardWidth, setCardWidth] = useState(300);
  useEffect(() => {
    const fit = () => setCardWidth(window.innerWidth < 560 ? 190 : window.innerWidth < 900 ? 240 : 300);
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);
  const shown = projects.filter((p) => filter === 'all' || (filter === 'residential' ? p.category !== 'office' && p.category !== 'showroom' : p.category === filter));
  return (
    <div className="project-ring">
      {filters && (
        <div className="filters" role="group" aria-label="Filter projects">
          {categoryFilters.map((f) => (
            <button key={f.key} type="button" className="chip" aria-pressed={filter === f.key} onClick={() => setFilter(f.key)}>{f.label}</button>
          ))}
        </div>
      )}
      {shown.length ? (
        <div className="project-ring__stage">
          <CircularCarousel
            key={filter}
            items={shown.map(({ src, alt, title, subtitle }) => ({ src, alt, title, subtitle }))}
            preset="cylinder"
            intro="rise"
            autoplay="drift"
            speed={9}
            cardWidth={cardWidth}
            aspectRatio={0.8}
            pauseOnHover
            focusOnClick
            fadeColor="#f7f2e9"
            cornerRadius={4}
            captions
            onItemClick={(_, i) => router.push(`/projects/${shown[i].slug}`)}
          />
        </div>
      ) : <p className="notice">No projects in this category yet.</p>}
    </div>
  );
}

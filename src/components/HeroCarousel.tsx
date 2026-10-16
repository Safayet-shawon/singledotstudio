'use client';
import { useCallback, useEffect, useState } from 'react';

/** Cross-fading photo carousel with slow push-in, dots, auto-advance and reduced-motion respect. */
export function HeroCarousel({ slides }: { slides: string[] }) {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduce, setReduce] = useState(false);
  const go = useCallback((n: number) => setI((n + slides.length) % slides.length), [slides.length]);

  useEffect(() => { setReduce(window.matchMedia('(prefers-reduced-motion: reduce)').matches); }, []);
  useEffect(() => {
    if (paused || reduce) return;
    const t = window.setInterval(() => setI((c) => (c + 1) % slides.length), 6500);
    return () => window.clearInterval(t);
  }, [paused, reduce, slides.length]);

  return (
    <div className="carousel" role="group" aria-roledescription="carousel" aria-label="Featured interiors">
      {slides.map((src, n) => (
        <img key={src} src={src} alt="" className={`carousel__slide${n === i ? ' is-on' : ''}`} loading={n === 0 ? 'eager' : 'lazy'} aria-hidden={n !== i} />
      ))}
      <div className="carousel__ui">
        <button type="button" className="carousel__arrow" aria-label="Previous image" onClick={() => go(i - 1)}>‹</button>
        <div className="carousel__dots">
          {slides.map((_, n) => (
            <button key={n} type="button" aria-label={`Show image ${n + 1}`} aria-current={n === i} className={n === i ? 'is-on' : ''} onClick={() => go(n)} />
          ))}
        </div>
        <button type="button" className="carousel__arrow" aria-label="Next image" onClick={() => go(i + 1)}>›</button>
        <button type="button" className="carousel__pause" aria-label={paused ? 'Resume slideshow' : 'Pause slideshow'} onClick={() => setPaused((p) => !p)}>{paused ? '▶' : '❚❚'}</button>
      </div>
    </div>
  );
}

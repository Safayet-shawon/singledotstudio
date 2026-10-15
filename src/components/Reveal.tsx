'use client';
import { useEffect, useRef, type ReactNode } from 'react';

export function JsReady() {
  useEffect(() => { document.documentElement.classList.add('js-ready'); }, []);
  return null;
}

export function Reveal({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!('IntersectionObserver' in window)) { el.classList.add('in'); return; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { el.classList.add('in'); io.disconnect(); } }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return <div ref={ref} className={className} data-reveal style={delay ? { transitionDelay: `${delay}ms` } : undefined}>{children}</div>;
}

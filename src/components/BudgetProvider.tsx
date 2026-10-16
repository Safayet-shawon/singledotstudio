'use client';
import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Icon } from './Icon';
import { store, KEYS } from '@/lib/storage';

const Calculator = dynamic(() => import('./Calculator'), { ssr: false });
const Ctx = createContext<{ open: () => void }>({ open: () => {} });
export const useBudget = () => useContext(Ctx);

export function OpenBudgetButton({ className = 'btn', children }: { className?: string; children: ReactNode }) {
  const { open } = useBudget();
  return <button type="button" className={className} onClick={open}>{children}</button>;
}

export function BudgetProvider({ children }: { children: ReactNode }) {
  const path = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [teaser, setTeaser] = useState(false);
  const dlg = useRef<HTMLDialogElement>(null);
  const lastFocus = useRef<HTMLElement | null>(null);
  const onPage = path === '/calculate-budget';

  const open = useCallback(() => {
    lastFocus.current = document.activeElement as HTMLElement;
    setTeaser(false);
    if (!store.get(KEYS.prompt)) store.set(KEYS.prompt, 'opened');
    setIsOpen(true);
  }, []);
  const close = useCallback(() => setIsOpen(false), []);

  useEffect(() => {
    const d = dlg.current;
    if (!d) return;
    if (isOpen && !d.open) d.showModal();
    if (!isOpen && d.open) { d.close(); lastFocus.current?.focus?.(); }
  }, [isOpen]);

  // One-time, non-modal prompt. Once shown, dismissed, opened or completed it never appears again in this browser.
  useEffect(() => {
    if (onPage || store.get(KEYS.prompt)) return;
    const t = window.setTimeout(() => {
      if (store.get(KEYS.prompt)) return;
      store.set(KEYS.prompt, 'seen');
      setTeaser(true);
    }, 12000);
    return () => window.clearTimeout(t);
  }, [onPage, path]);

  const dismiss = () => { store.set(KEYS.prompt, 'dismissed'); setTeaser(false); };

  return (
    <Ctx.Provider value={{ open }}>
      {children}
      {!onPage && (
        <>
          {teaser && !isOpen && (
            <div className="teaser" role="region" aria-label="Budget calculator suggestion">
              <p>Planning a project? Get an indicative budget in four quick steps.</p>
              <button type="button" className="btn btn--solid" onClick={open} style={{ minHeight: 40, padding: '0.6em 1.2em' }}>Try it</button>
              <button type="button" className="x" aria-label="Dismiss suggestion" onClick={dismiss}><Icon name="close" size={16} /></button>
            </div>
          )}
          <button type="button" className="fab" onClick={open} aria-haspopup="dialog" aria-label="Calculate your budget now">
            <span className="fab__pulse" aria-hidden="true" />
            <span className="fab__badge" aria-hidden="true">Free</span>
            <span className="fab__core"><Icon name="calc" size={24} /></span>
            <span className="fab__text">
              <span className="fab__label">Calculate Now</span>
              <span className="fab__sub">Your budget in 60 seconds</span>
            </span>
            <span className="fab__arrow" aria-hidden="true"><Icon name="arrow" size={18} /></span>
          </button>
        </>
      )}
      <dialog ref={dlg} className="calc" aria-label="Budget calculator" onClose={() => setIsOpen(false)} onClick={(e) => { if (e.target === dlg.current) close(); }}>
        {isOpen && <Calculator variant="dialog" onClose={close} />}
      </dialog>
    </Ctx.Provider>
  );
}

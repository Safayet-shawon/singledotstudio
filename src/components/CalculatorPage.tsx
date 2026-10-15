'use client';
import dynamic from 'next/dynamic';

const Calculator = dynamic(() => import('./Calculator'), { ssr: false, loading: () => <p className="hint" role="status">Loading calculator…</p> });

export function CalculatorPage() {
  return <Calculator variant="page" />;
}

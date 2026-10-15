import type { Metadata } from 'next';
import { CalculatorPage } from '@/components/CalculatorPage';
import { PageHead } from '@/components/sections';

export const metadata: Metadata = {
  title: 'Calculate Your Budget',
  description: 'A four-step interior budget calculator with a downloadable PDF estimate.',
  alternates: { canonical: '/calculate-budget' },
};

export default function BudgetPage() {
  return (
    <>
      <PageHead eyebrow="Budget calculator" title="Calculate your budget" lede="Four short steps to an indicative estimate. Estimates are ranges, not quotations." />
      <div className="container" style={{ paddingBottom: 'var(--section)' }}><CalculatorPage /></div>
    </>
  );
}

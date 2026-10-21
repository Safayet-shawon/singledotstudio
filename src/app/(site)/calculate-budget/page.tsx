import type { Metadata } from 'next';
import { CalculatorPage } from '@/components/CalculatorPage';
import { PageHead } from '@/components/sections';

export const metadata: Metadata = {
  title: 'Calculate Your Budget',
  description: 'A guided interior budget calculator. Your quotation is emailed to you.',
  alternates: { canonical: '/calculate-budget' },
};

export default function BudgetPage() {
  return (
    <>
      <PageHead eyebrow="Budget calculator" title="Calculate your budget" lede="A few quick questions, and your quotation arrives by email." />
      <div className="container" style={{ paddingBottom: 'var(--section)' }}><CalculatorPage /></div>
    </>
  );
}

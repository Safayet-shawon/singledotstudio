import type { Metadata, Viewport } from 'next';
import { Cormorant_Garamond, Nunito_Sans } from 'next/font/google';
import './globals.css';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { BudgetProvider } from '@/components/BudgetProvider';
import { JsReady } from '@/components/Reveal';
import { site } from '@/config/site';

const display = Cormorant_Garamond({ subsets: ['latin'], weight: ['400', '500', '600'], style: ['normal', 'italic'], variable: '--font-display', display: 'swap' });
const sans = Nunito_Sans({ subsets: ['latin'], weight: ['300', '400', '500', '600'], variable: '--font-sans', display: 'swap' });

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: `${site.brand.name} | ${site.brand.tagline}`, template: `%s | ${site.brand.name}` },
  description: `${site.brand.name} designs kitchens, bedrooms, bathrooms, living spaces and offices. Book a consultation or calculate an indicative budget.`,
  openGraph: { type: 'website', siteName: site.brand.name, title: `${site.brand.name} | ${site.brand.tagline}`, description: site.heroQuote },
  alternates: { canonical: '/' },
};
export const viewport: Viewport = { themeColor: '#f7f2e9', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable}`}>
      <body>
        <a className="skip" href="#main">Skip to content</a>
        <JsReady />
        <BudgetProvider>
          <Header />
          <main id="main">{children}</main>
          <Footer />
        </BudgetProvider>
      </body>
    </html>
  );
}

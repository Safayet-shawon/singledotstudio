import type { Metadata, Viewport } from 'next';
import type { CSSProperties } from 'react';
import { Cormorant_Garamond, DM_Sans, DM_Serif_Display, Inter, Jost, Lora, Nunito_Sans, Playfair_Display } from 'next/font/google';
import '../globals.css';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { BudgetProvider } from '@/components/BudgetProvider';
import { JsReady } from '@/components/Reveal';
import { Splash } from '@/components/Splash';
import { site } from '@/config/site';
import { FONTS, getContent } from '@/server/cms';

// Approved font families the CMS can switch between. Only the chosen ones are actually downloaded by visitors.
const cormorant = Cormorant_Garamond({ subsets: ['latin'], weight: ['400', '500', '600'], style: ['normal', 'italic'], variable: '--f-cormorant', display: 'swap' });
const nunito = Nunito_Sans({ subsets: ['latin'], weight: ['300', '400', '500', '600'], variable: '--f-nunito', display: 'swap' });
const playfair = Playfair_Display({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--f-playfair', display: 'swap', preload: false });
const lora = Lora({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--f-lora', display: 'swap', preload: false });
const dmserif = DM_Serif_Display({ subsets: ['latin'], weight: '400', variable: '--f-dmserif', display: 'swap', preload: false });
const jost = Jost({ subsets: ['latin'], weight: ['300', '400', '500', '600'], variable: '--f-jost', display: 'swap', preload: false });
const inter = Inter({ subsets: ['latin'], weight: ['300', '400', '500', '600'], variable: '--f-inter', display: 'swap', preload: false });
const dmsans = DM_Sans({ subsets: ['latin'], weight: ['300', '400', '500', '600'], variable: '--f-dmsans', display: 'swap', preload: false });
const fontClasses = [cormorant, nunito, playfair, lora, dmserif, jost, inter, dmsans].map((f) => f.variable).join(' ');

export async function generateMetadata(): Promise<Metadata> {
  const c = await getContent();
  return {
    metadataBase: new URL(site.url),
    title: { default: c.seo.title, template: `%s | ${site.brand.name}` },
    description: c.seo.description,
    openGraph: { type: 'website', siteName: site.brand.name, title: c.seo.title, description: c.hero.quote, images: [{ url: '/media/img/home-poster.jpg', alt: site.brand.name }] },
    twitter: { card: 'summary_large_image', title: c.seo.title, description: c.hero.quote, images: ['/media/img/home-poster.jpg'] },
    alternates: { canonical: '/' },
  };
}
export const viewport: Viewport = { themeColor: '#f7f2e9', width: 'device-width', initialScale: 1 };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const t = (await getContent()).typography;
  const h = FONTS.heading.find((f) => f.key === t.heading) ?? FONTS.heading[0];
  const b = FONTS.body.find((f) => f.key === t.body) ?? FONTS.body[0];
  const style = { ['--font-display' as string]: h.stack, ['--font-sans' as string]: b.stack, ['--hw' as string]: t.headingWeight, ['--bw' as string]: t.bodyWeight } as CSSProperties;
  return (
    <html lang="en" className={fontClasses} style={style}>
      <body>
        <a className="skip" href="#main">Skip to content</a>
        <JsReady />
        <Splash />
        <BudgetProvider>
          <Header />
          <main id="main">{children}</main>
          <Footer />
        </BudgetProvider>
      </body>
    </html>
  );
}

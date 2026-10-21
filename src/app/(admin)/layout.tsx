import type { Metadata, Viewport } from 'next';
import { Cormorant_Garamond, DM_Sans, DM_Serif_Display, Inter, Jost, Lora, Nunito_Sans, Playfair_Display } from 'next/font/google';
import '../admin.css';

const body = Nunito_Sans({ subsets: ['latin'], weight: ['400', '600', '700'], variable: '--f-nunito', display: 'swap' });
const display = Cormorant_Garamond({ subsets: ['latin'], weight: ['500', '600', '700'], variable: '--f-cormorant', display: 'swap' });

// Approved website fonts, loaded here only so the CMS typography preview can show them.
const pf = Playfair_Display({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--f-playfair', display: 'swap', preload: false });
const lo = Lora({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--f-lora', display: 'swap', preload: false });
const dm = DM_Serif_Display({ subsets: ['latin'], weight: '400', variable: '--f-dmserif', display: 'swap', preload: false });
const jo = Jost({ subsets: ['latin'], weight: ['300', '400', '500', '600'], variable: '--f-jost', display: 'swap', preload: false });
const it = Inter({ subsets: ['latin'], weight: ['300', '400', '500', '600'], variable: '--f-inter', display: 'swap', preload: false });
const ds = DM_Sans({ subsets: ['latin'], weight: ['300', '400', '500', '600'], variable: '--f-dmsans', display: 'swap', preload: false });
const previewFonts = [pf, lo, dm, jo, it, ds].map((f) => f.variable).join(' ');

export const metadata: Metadata = { title: { default: 'Studio OS', template: '%s | Studio OS' }, robots: { index: false, follow: false } };
export const viewport: Viewport = { themeColor: '#123d2b', width: 'device-width', initialScale: 1 };

export default function AdminRoot({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${body.variable} ${display.variable} ${previewFonts}`}>
      <body className="ad">{children}</body>
    </html>
  );
}

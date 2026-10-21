import Link from 'next/link';
import { Brand } from './Brand';
import { services, site } from '@/config/site';
import { getContent } from '@/server/cms';

const tbd = (v: string | null, label: string) => (v ? v : <span className="tbd">[{label} to be added]</span>);

export async function Footer() {
  const content = await getContent();
  const c = { phone: content.contact.phone || null, email: content.contact.email || null, address: content.contact.address || null };
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer__grid">
          <div>
            <Brand />
            <p style={{ maxWidth: '34ch' }}>{content.footer.blurb}</p>
          </div>
          <div>
            <h4>Explore</h4>
            <ul>
              <li><Link href="/">Home</Link></li>
              <li><Link href="/about">About</Link></li>
              <li><Link href="/projects">Projects</Link></li>
              <li><Link href="/calculate-budget">Calculate your budget</Link></li>
              <li><Link href="/contact">Get in touch</Link></li>
            </ul>
          </div>
          <div>
            <h4>Services</h4>
            <ul>{services.map((s) => <li key={s.slug}><Link href={`/services/${s.slug}`}>{s.name}</Link></li>)}</ul>
          </div>
          <div>
            <h4>Contact</h4>
            <ul>
              <li>{tbd(c.phone, 'Phone')}</li>
              <li>{tbd(c.email, 'Email')}</li>
              <li>{tbd(c.address, 'Address')}</li>
              {site.social.map((s) => <li key={s.href}><a href={s.href} rel="noopener noreferrer" target="_blank">{s.label}</a></li>)}
            </ul>
          </div>
        </div>
        <div className="footer__bottom">
          <span>© {new Date().getFullYear()} {site.brand.name}. All rights reserved.</span>
          <span><Link href="/privacy">Privacy Policy</Link> · <Link href="/terms">Terms and Conditions</Link> · <Link href="/credits">Photo credits</Link></span>
        </div>
      </div>
    </footer>
  );
}

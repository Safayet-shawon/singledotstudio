import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="notfound">
      <div>
        <span className="eyebrow">404</span>
        <h1>This page could not be found</h1>
        <p className="lede" style={{ margin: '16px auto 28px' }}>The page may have moved. Head back home or explore our services.</p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link className="btn btn--solid" href="/">Home</Link>
          <Link className="btn" href="/services">Our services</Link>
        </div>
      </div>
    </div>
  );
}

'use client';

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="notfound">
      <div>
        <h1>Something went wrong</h1>
        <p className="lede" style={{ margin: '16px auto 28px' }}>Please try again.</p>
        <button className="btn btn--solid" onClick={reset}>Try again</button>
      </div>
    </div>
  );
}

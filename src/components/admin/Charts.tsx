'use client';
import { useEffect, useRef, useState } from 'react';

const COLORS = ['#166534', '#16a34a', '#86d3a1', '#c9a227', '#c2410c', '#2b6cb0', '#7c9a8a'];

/** Counts up from 0 to the real value. Respects reduced motion. */
export function CountUp({ value, format = 'int', ms = 900 }: { value: number; format?: 'int' | 'money'; ms?: number }) {
  const [v, setV] = useState(0);
  const raf = useRef(0);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || value === 0) { setV(value); return; }
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / ms);
      setV(value * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [value, ms]);
  const n = Math.round(v);
  return <>{format === 'money' ? `৳${new Intl.NumberFormat('en-BD').format(n)}` : new Intl.NumberFormat('en-BD').format(n)}</>;
}

export interface Slice { label: string; value: number; color?: string; href?: string }

export function Donut({ data, total, centerLabel }: { data: Slice[]; total?: number; centerLabel?: string }) {
  const sum = total ?? data.reduce((a, d) => a + d.value, 0);
  const R = 52, C = 2 * Math.PI * R;
  const [on, setOn] = useState(false);
  useEffect(() => { const t = setTimeout(() => setOn(true), 60); return () => clearTimeout(t); }, []);
  let off = 0;
  return (
    <div style={{ display: 'grid', gap: 14, justifyItems: 'center' }}>
      <svg viewBox="0 0 140 140" width="168" height="168" role="img" aria-label={`${centerLabel ?? 'Total'}: ${sum}`}>
        <circle cx="70" cy="70" r={R} fill="none" stroke="#f0f7f1" strokeWidth="16" />
        {sum > 0 && data.map((d, i) => {
          const len = (d.value / sum) * C;
          const el = <circle key={d.label} className="ad-donut-seg" cx="70" cy="70" r={R} fill="none" stroke={d.color ?? COLORS[i % COLORS.length]} strokeWidth="16" strokeDasharray={`${on ? len : 0} ${C}`} strokeDashoffset={-off} transform="rotate(-90 70 70)" />;
          off += len; return el;
        })}
        <text x="70" y="68" textAnchor="middle" style={{ fontSize: 26, fontWeight: 700, fill: '#18251d' }}>{sum}</text>
        <text x="70" y="86" textAnchor="middle">{centerLabel ?? 'total'}</text>
      </svg>
      <div className="ad-legend">{data.map((d, i) => <span key={d.label}><i style={{ background: d.color ?? COLORS[i % COLORS.length] }} />{d.label} <b style={{ color: '#18251d' }}>{d.value}</b></span>)}</div>
    </div>
  );
}

export function Bars({ data, height = 180, money }: { data: { label: string; value: number }[]; height?: number; money?: boolean }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const W = 360, pad = 22, bw = (W - pad * 2) / Math.max(1, data.length);
  return (
    <svg className="ad-chart" viewBox={`0 0 ${W} ${height + 26}`} role="img" aria-label="Bar chart">
      {[0, 0.5, 1].map((g) => <line key={g} x1={pad} x2={W - pad} y1={height - g * (height - 14)} y2={height - g * (height - 14)} stroke="#e3ebe5" strokeDasharray="3 4" />)}
      {data.map((d, i) => {
        const h = (d.value / max) * (height - 14);
        return (
          <g key={d.label}>
            <rect className="ad-bar-rect" style={{ animationDelay: `${i * 70}ms` }} x={pad + i * bw + bw * 0.18} y={height - h} width={bw * 0.64} height={Math.max(h, d.value > 0 ? 2 : 0)} rx="5" fill="#16a34a"><title>{`${d.label}: ${money ? '৳' : ''}${d.value}`}</title></rect>
            <text x={pad + i * bw + bw / 2} y={height + 16} textAnchor="middle">{d.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

export function LineChart({ data, height = 160 }: { data: { label: string; value: number }[]; height?: number }) {
  const W = 360, pad = 22;
  const max = Math.max(1, ...data.map((d) => d.value));
  const step = (W - pad * 2) / Math.max(1, data.length - 1);
  const pts = data.map((d, i) => [pad + i * step, height - (d.value / max) * (height - 16)] as const);
  const path = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
  const area = `${path} L${pts[pts.length - 1]?.[0] ?? pad} ${height} L${pts[0]?.[0] ?? pad} ${height} Z`;
  return (
    <svg className="ad-chart" viewBox={`0 0 ${W} ${height + 26}`} role="img" aria-label="Line chart">
      <defs><linearGradient id="lg" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#16a34a" stopOpacity="0.25" /><stop offset="1" stopColor="#16a34a" stopOpacity="0" /></linearGradient></defs>
      {[0, 0.5, 1].map((g) => <line key={g} x1={pad} x2={W - pad} y1={height - g * (height - 16)} y2={height - g * (height - 16)} stroke="#e3ebe5" strokeDasharray="3 4" />)}
      {pts.length > 1 && <path d={area} fill="url(#lg)" style={{ animation: 'adfade 1s 0.5s both' }} />}
      {pts.length > 1 && <path className="ad-line-path" style={{ ['--len' as string]: 900 }} d={path} fill="none" stroke="#166534" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />}
      {pts.map((p, i) => <g key={i}><circle cx={p[0]} cy={p[1]} r="3.5" fill="#fff" stroke="#166534" strokeWidth="2"><title>{`${data[i].label}: ${data[i].value}`}</title></circle><text x={p[0]} y={height + 16} textAnchor="middle">{data[i].label}</text></g>)}
    </svg>
  );
}

export function Progress({ pct, tone = '' }: { pct: number; tone?: '' | 'amber' | 'red' }) {
  return <div className={`ad-bar ${tone}`} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}><i style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} /></div>;
}

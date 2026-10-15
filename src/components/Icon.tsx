import type { ReactNode, SVGProps } from 'react';

const paths: Record<string, ReactNode> = {
  arrow: <path d="M4 12h16M14 6l6 6-6 6" />,
  close: <path d="M5 5l14 14M19 5L5 19" />,
  menu: <path d="M3 8h18M3 16h18" />,
  down: <path d="M6 9l6 6 6-6" />,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  calc: <><rect x="5" y="3" width="14" height="18" rx="1.5" /><path d="M8 7h8M8 11h2M12 11h2M8 15h2M12 15h2M16 11v6" /></>,
  kitchen: <><rect x="4" y="3" width="16" height="18" rx="1.5" /><circle cx="9" cy="8" r="1.8" /><circle cx="15" cy="8" r="1.8" /><path d="M4 13h16" /><rect x="8" y="15" width="8" height="3" /></>,
  bed: <path d="M3 19v-7a2 2 0 012-2h14a2 2 0 012 2v7M3 16h18M6 10V7a1 1 0 011-1h4a1 1 0 011 1v3" />,
  bath: <path d="M4 12h16v2a5 5 0 01-5 5H9a5 5 0 01-5-5v-2zM6 12V6a2 2 0 014 0M7 19l-1 2M17 19l1 2" />,
  sofa: <path d="M5 11V8a2 2 0 012-2h10a2 2 0 012 2v3M3 13a2 2 0 014 0v2h10v-2a2 2 0 014 0v5H3zM6 18v2M18 18v2" />,
  desk: <><rect x="4" y="4" width="16" height="11" rx="1.5" /><path d="M8 20h8M12 15v5" /></>,
  plan: <path d="M4 4h16v16H4zM4 11h8M12 4v7M12 15v5M16 11h4" />,
  compass: <><circle cx="12" cy="12" r="9" /><path d="M15.5 8.5l-2 5-5 2 2-5z" /></>,
  scope: <path d="M5 4h14v16H5zM9 9h6M9 13h6M9 17h3" />,
  team: <><circle cx="9" cy="8" r="3" /><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M16 5.5a3 3 0 010 5M18 14c2 .7 3 2.8 3 6" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  shield: <path d="M12 3l8 3v6c0 4.5-3.2 7.8-8 9-4.8-1.2-8-4.5-8-9V6zM8.5 12l2.5 2.5L16 9.5" />,
  whatsapp: <path d="M4 20l1.3-4.2A8 8 0 1112 20a8 8 0 01-3.8-1zM9 9c0 3 3 6 6 6l1-1.5-2-1-1 .7c-1-.4-1.8-1.2-2.2-2.2l.7-1-1-2z" />,
  download: <path d="M12 4v11M7 11l5 5 5-5M5 20h14" />,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" /></>,
  image: <><rect x="3" y="5" width="18" height="14" rx="1" /><circle cx="9" cy="10" r="1.6" /><path d="M3 17l6-5 4 3 3-2 5 4" /></>,
  prev: <path d="M15 5l-7 7 7 7" />,
  next: <path d="M9 5l7 7-7 7" />,
  pause: <path d="M8 5v14M16 5v14" />,
  play: <path d="M8 5l11 7-11 7z" />,
};

export function Icon({ name, size = 22, ...rest }: { name: string; size?: number } & SVGProps<SVGSVGElement>) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...rest}>
      {paths[name] ?? null}
    </svg>
  );
}

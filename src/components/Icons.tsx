import type { SVGProps } from 'react';

type P = SVGProps<SVGSVGElement>;
const base = (d: React.ReactNode, props: P) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
    {d}
  </svg>
);

export const IconToday = (p: P) => base(<><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" /></>, p);
export const IconDumbbell = (p: P) => base(<><path d="M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11" /></>, p);
export const IconChart = (p: P) => base(<><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>, p);
export const IconBriefcase = (p: P) => base(<><rect x="3" y="7" width="18" height="13" rx="2.5" /><path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7M3 13h18" /></>, p);
export const IconBook = (p: P) => base(<><path d="M4 19.5V5a2 2 0 0 1 2-2h13v16H6.5a2.5 2.5 0 0 0 0 5H19" /><path d="M8 7h7" /></>, p);
export const IconCheck = (p: P) => base(<path d="M5 12.5l4.5 4.5L19 7.5" strokeWidth={3} />, p);
export const IconChevronL = (p: P) => base(<path d="M15 18l-6-6 6-6" />, p);
export const IconChevronR = (p: P) => base(<path d="M9 18l6-6-6-6" />, p);
export const IconPlus = (p: P) => base(<path d="M12 5v14M5 12h14" />, p);
export const IconMinus = (p: P) => base(<path d="M5 12h14" />, p);
export const IconTimer = (p: P) => base(<><circle cx="12" cy="13" r="8" /><path d="M12 9v4l2.5 2.5M9.5 2h5" /></>, p);
export const IconTarget = (p: P) => base(<><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" /></>, p);
export const IconAlert = (p: P) => base(<><path d="M12 3l10 18H2L12 3z" /><path d="M12 10v4M12 17.5v.5" /></>, p);
export const IconPause = (p: P) => base(<><path d="M9 5v14M15 5v14" /></>, p);
export const IconPlay = (p: P) => base(<path d="M7 4.5v15l12-7.5-12-7.5z" />, p);
export const IconX = (p: P) => base(<path d="M6 6l12 12M18 6L6 18" />, p);
export const IconRefresh = (p: P) => base(<><path d="M3 12a9 9 0 0 1 15.5-6.2L21 8M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-15.5 6.2L3 16M3 21v-5h5" /></>, p);
export const IconTrash = (p: P) => base(<><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></>, p);
export const IconSettings = (p: P) => base(<><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></>, p);
export const IconDrop = (p: P) => base(<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z" />, p);
export const IconLink = (p: P) => base(<><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" /><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" /></>, p);

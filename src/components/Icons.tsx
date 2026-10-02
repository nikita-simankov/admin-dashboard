import type { SVGProps } from 'react';

type P = SVGProps<SVGSVGElement>;
const base = (d: React.ReactNode, props: P) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
    {d}
  </svg>
);

export const IconSun = (p: P) => base(<><circle cx="12" cy="12" r="4" /><path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8" /></>, p);
export const IconTorch = (p: P) => base(<><path d="M12 2.8c2.2 2.4 3.3 4.1 3.3 5.9a3.3 3.3 0 0 1-6.6 0c0-1.3.6-2.4 1.6-3.4.2 1 .8 1.7 1.6 2 .1-1.6-.2-3-.0-4.5z" /><path d="M8 12.5h8l-1.6 2H9.6z" /><path d="M10.4 14.5l.8 7h1.6l.8-7" /></>, p);
export const IconScroll = (p: P) => base(<><path d="M7 4h11a2 2 0 0 1 2 2v1.5h-4" /><path d="M7 4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-1.5h2" /><path d="M7 4a2 2 0 0 0-2 2v1.5h4M9 20h8a2 2 0 0 0 2-2V7.5M12 10h4M12 13.5h4" /></>, p);
export const IconBook = (p: P) => base(<><path d="M12 6.5C10 5 7 4.5 3.5 5v14c3.5-.5 6.5 0 8.5 1.5 2-1.5 5-2 8.5-1.5V5C17 4.5 14 5 12 6.5z" /><path d="M12 6.5v14" /></>, p);
export const IconColumn = (p: P) => base(<><path d="M4 20.5h16M5.5 18h13M5 4h14l-1.2 2.5H6.2zM7 6.5h10" /><path d="M8 6.5V18M12 6.5V18M16 6.5V18" /></>, p);
export const IconHourglass = (p: P) => base(<><path d="M6.5 3h11M6.5 21h11" /><path d="M7.5 3v2.2c0 2.4 4.5 4.3 4.5 6.8 0-2.5 4.5-4.4 4.5-6.8V3M7.5 21v-2.2c0-2.4 4.5-4.3 4.5-6.8 0 2.5 4.5 4.4 4.5 6.8V21" /></>, p);
export const IconPlus = (p: P) => base(<path d="M12 5v14M5 12h14" />, p);
export const IconMinus = (p: P) => base(<path d="M5 12h14" />, p);
export const IconChevronL = (p: P) => base(<path d="M14.5 18l-6-6 6-6" />, p);
export const IconChevronR = (p: P) => base(<path d="M9.5 18l6-6-6-6" />, p);
export const IconArrowR = (p: P) => base(<path d="M4 12h15M14 7l5 5-5 5" />, p);
export const IconX = (p: P) => base(<path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />, p);
export const IconPause = (p: P) => base(<path d="M9 5.5v13M15 5.5v13" />, p);
export const IconPlay = (p: P) => base(<path d="M7.5 5v14l11-7z" />, p);
export const IconEdit = (p: P) => base(<><path d="M4 20h4L18.5 9.5a2.1 2.1 0 0 0-4-4L4 16v4z" /><path d="M13.5 6.5l4 4" /></>, p);
export const IconTrash = (p: P) => base(<path d="M5 7h14M10 11v6M14 11v6M6.5 7l1 13h9l1-13M9.5 7V4.5h5V7" />, p);

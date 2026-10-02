// Classical ornaments: laurel wreath, Roman numerals, page header.
import { useId } from 'react';

const ROMAN: [number, string][] = [
  [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'],
  [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
];
export function toRoman(n: number): string {
  let out = '';
  for (const [v, s] of ROMAN) while (n >= v) { out += s; n -= v; }
  return out;
}
export const romanSize = (s: string) => (s.length <= 2 ? '' : s.length <= 4 ? 'l' : s.length <= 6 ? 'xl' : 'xxl');

// Wreath geometry (200×200 box): leaves sit on an arc on the left and are
// mirrored to the right. Leaf i lights when `lit > i`, so the wreath grows
// from the tie upward as the day's rules are kept.
const R = 80;
const LEAVES = 9;
const pt = (deg: number, r = R) => [100 + Math.cos((deg * Math.PI) / 180) * r, 100 + Math.sin((deg * Math.PI) / 180) * r];
const leafPath = (len: number, w: number) => `M0 0Q${len * 0.45} ${-w / 2} ${len} 0Q${len * 0.45} ${w / 2} 0 0Z`;
const leaves = Array.from({ length: LEAVES }, (_, i) => {
  const theta = 106 + i * 17.5;
  const [x, y] = pt(theta);
  const outward = i % 2 === 0;
  const angle = theta + 90 + (outward ? -34 : 34);
  const scale = 1 - i * 0.03;
  return { x, y, angle, d: leafPath(21 * scale, 8.4 * scale) };
});
const [sx, sy] = pt(100);
const [ex, ey] = pt(262);
const STEM = `M${sx.toFixed(1)} ${sy.toFixed(1)}A${R} ${R} 0 0 1 ${ex.toFixed(1)} ${ey.toFixed(1)}`;

function Branch({ lit, fill }: { lit: number; fill: string }) {
  return (
    <g>
      <path className="stem" d={STEM} />
      {leaves.map((l, i) => (
        <path key={i} className={`leaf${lit > i ? ' on' : ''}`} d={l.d} fill={fill}
          transform={`translate(${l.x.toFixed(1)} ${l.y.toFixed(1)}) rotate(${l.angle.toFixed(1)})`} />
      ))}
    </g>
  );
}

export function Laurel({ lit, children, className = '' }: { lit: number; children?: React.ReactNode; className?: string }) {
  // Each wreath owns its gradient: a shared id breaks when the first wreath is display:none.
  const id = `leaf-${useId().replace(/:/g, '')}`;
  return (
    <div className={`wreath ${className}`}>
      <svg viewBox="0 0 200 200" aria-hidden="true">
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#efdaa8" />
            <stop offset="0.5" stopColor="#c9a96e" />
            <stop offset="1" stopColor="#94743f" />
          </linearGradient>
        </defs>
        <Branch lit={lit} fill={`url(#${id})`} />
        <g transform="translate(200 0) scale(-1 1)"><Branch lit={lit} fill={`url(#${id})`} /></g>
        <path className="tie" d="M89 181q11 7 22 0M97 184l-6 11M103 184l6 11" />
      </svg>
      {children && <div className="wreath-core">{children}</div>}
    </div>
  );
}

export function PageHeader({ over, title, children }: { over: React.ReactNode; title: React.ReactNode; children?: React.ReactNode }) {
  return (
    <header className="ph">
      <div className="ph-text">
        <div className="overline">{over}</div>
        <h1>{title}</h1>
      </div>
      {children && <div className="ph-actions">{children}</div>}
    </header>
  );
}

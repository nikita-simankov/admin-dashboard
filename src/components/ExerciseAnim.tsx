import { useEffect, useMemo, useRef } from 'react';
import { ANIMS, type AnimId } from '../data/animations';
import { FLOOR, HEAD_R, frameBox, poly, poseAt, solve, type Box, type Prop, type Skeleton } from '../lib/figure';

// One rAF loop shared by every visible animation.
const subs = new Set<(now: number) => void>();
let raf = 0;
function tick(now: number) {
  subs.forEach((fn) => fn(now));
  raf = subs.size ? requestAnimationFrame(tick) : 0;
}
function subscribe(fn: (now: number) => void) {
  subs.add(fn);
  if (!raf) raf = requestAnimationFrame(tick);
  return () => void subs.delete(fn);
}
const reducedMotion = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

function PropShape({ p, box }: { p: Prop; box: Box }) {
  switch (p.k) {
    case 'floor':
      return <line className="anim-floor" x1={box.x} y1={FLOOR + 1} x2={box.x + box.w} y2={FLOOR + 1} />;
    case 'bar':
      return <g className="anim-prop"><line x1={p.x} y1={box.y} x2={p.x} y2={p.y} /><circle cx={p.x} cy={p.y} r={3.2} /></g>;
    case 'lowbar':
      return <g className="anim-prop"><line x1={p.x} y1={p.y} x2={p.x} y2={FLOOR} /><circle cx={p.x} cy={p.y} r={3.2} /></g>;
    case 'pbars':
      return (
        <g className="anim-prop">
          <line x1={p.x1 + 6} y1={p.y} x2={p.x1 + 6} y2={FLOOR} />
          <line x1={p.x2 - 6} y1={p.y} x2={p.x2 - 6} y2={FLOOR} />
          <line className="anim-rail" x1={p.x1} y1={p.y} x2={p.x2} y2={p.y} />
        </g>
      );
    case 'box':
      return <rect className="anim-box" x={p.x} y={p.y} width={p.w} height={FLOOR - p.y + 1} rx={2.5} />;
    case 'pad':
      return <rect className="anim-pad" x={p.x} y={p.y} width={p.w} height={p.h} rx={2} />;
  }
}

type Refs = Record<'armF' | 'legF' | 'torso' | 'legNh' | 'legN' | 'armNh' | 'armN', SVGPathElement | null> & { head: SVGCircleElement | null };

function paint(r: Refs, s: Skeleton) {
  r.armF?.setAttribute('d', poly(s.armF));
  r.legF?.setAttribute('d', poly(s.legF));
  r.torso?.setAttribute('d', poly([s.hip, s.shoulder]));
  const legN = poly(s.legN), armN = poly(s.armN);
  r.legNh?.setAttribute('d', legN);
  r.legN?.setAttribute('d', legN);
  r.armNh?.setAttribute('d', armN);
  r.armN?.setAttribute('d', armN);
  r.head?.setAttribute('cx', String(s.head[0]));
  r.head?.setAttribute('cy', String(s.head[1]));
}

export function ExerciseAnim({ id, label, className = '' }: { id: AnimId; label: string; className?: string }) {
  const anim = ANIMS[id];
  const box = useMemo(() => frameBox(anim), [anim]);
  const svgRef = useRef<SVGSVGElement>(null);
  const refs = useRef<Refs>({ armF: null, legF: null, torso: null, legNh: null, legN: null, armNh: null, armN: null, head: null });

  useEffect(() => {
    const r = refs.current;
    // Static fallback: the "working" end of the movement.
    paint(r, solve(anim.frames[anim.frames.length > 2 ? 0 : 1]));
    if (reducedMotion() || !svgRef.current) return;
    let stop: (() => void) | undefined;
    const start = performance.now() - Math.random() * 400;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !stop) stop = subscribe((now) => paint(r, solve(poseAt(anim, (now - start) / 1000 / anim.dur))));
      else if (!e.isIntersecting && stop) { stop(); stop = undefined; }
    });
    io.observe(svgRef.current);
    return () => { io.disconnect(); stop?.(); };
  }, [anim]);

  const set = (k: keyof Refs) => (el: SVGPathElement | SVGCircleElement | null) => { (refs.current as Record<string, unknown>)[k] = el; };
  return (
    <svg ref={svgRef} className={`anim ${className}`} viewBox={`${box.x} ${box.y} ${box.w} ${box.h}`} role="img" aria-label={`Анимация: ${label}`}>
      {anim.props.map((p, i) => <PropShape key={i} p={p} box={box} />)}
      <g className="anim-fig">
        <path ref={set('armF')} className="far arm" />
        <path ref={set('legF')} className="far leg" />
        <path ref={set('torso')} className="torso" />
        <path ref={set('legNh')} className="halo leg" />
        <path ref={set('legN')} className="leg" />
        <path ref={set('armNh')} className="halo arm" />
        <path ref={set('armN')} className="arm" />
        <circle ref={set('head')} r={HEAD_R} className="head" />
      </g>
    </svg>
  );
}

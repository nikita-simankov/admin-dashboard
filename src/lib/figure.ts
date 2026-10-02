// Tiny 2D skeleton for exercise pictograms (side view, figure faces right).
// Angles are in degrees in SVG space: 0 = right, 90 = down, -90 = up.
// A limb is either posed by absolute segment angles or pinned to a point with
// two-bone IK, so hands stay on the floor/bar and feet stay planted while the
// body moves. Bone lengths never change, so motion reads as natural.

export type Vec = [number, number];
export type Limb = { a: [number, number] } | { ik: Vec; bend?: 1 | -1 };
export type Pose = {
  hip: Vec;
  torso: number;
  /** absolute head direction from the shoulder; defaults to the torso angle */
  head?: number;
  armN: Limb;
  armF?: Limb;
  legN: Limb;
  legF?: Limb;
  /** absolute foot angles; default is perpendicular to the shin */
  footN?: number;
  footF?: number;
};
export type Prop =
  | { k: 'floor' }
  | { k: 'bar'; x: number; y: number } // pull-up bar seen end-on, ceiling mount
  | { k: 'lowbar'; x: number; y: number } // low bar on a post
  | { k: 'pbars'; x1: number; x2: number; y: number } // parallel bars
  | { k: 'box'; x: number; y: number; w: number } // bench / box standing on the floor
  | { k: 'pad'; x: number; y: number; w: number; h: number }; // ankle anchor
export type Anim = {
  props: Prop[];
  frames: Pose[];
  /** order of frames in one loop; defaults to all frames */
  seq?: number[];
  /** relative duration of each segment of the loop */
  times?: number[];
  /** seconds per full loop */
  dur: number;
  /** fraction of each segment spent holding the key pose */
  hold?: number;
};

export const VIEW = { w: 160, h: 120 };
export const FLOOR = 110;
const L = { torso: 28, neckHead: 9, upper: 14, fore: 13, thigh: 20, shin: 19, foot: 6 };

const rad = (d: number) => (d * Math.PI) / 180;
const dir = (d: number): Vec => [Math.cos(rad(d)), Math.sin(rad(d))];
const add = (p: Vec, d: number, len: number): Vec => {
  const [x, y] = dir(d);
  return [p[0] + x * len, p[1] + y * len];
};
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerpV = (a: Vec, b: Vec, t: number): Vec => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];

/** Returns [joint, end, angle of the second segment]. */
function solveLimb(root: Vec, limb: Limb, l1: number, l2: number): [Vec, Vec, number] {
  if ('a' in limb) {
    const j = add(root, limb.a[0], l1);
    return [j, add(j, limb.a[1], l2), limb.a[1]];
  }
  const [tx, ty] = limb.ik;
  const dx = tx - root[0], dy = ty - root[1];
  const d = clamp(Math.hypot(dx, dy), Math.abs(l1 - l2) + 0.01, l1 + l2 - 0.01);
  const base = Math.atan2(dy, dx);
  const off = Math.acos(clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1));
  const a = base + (limb.bend ?? 1) * off;
  const j: Vec = [root[0] + Math.cos(a) * l1, root[1] + Math.sin(a) * l1];
  const e: Vec = [root[0] + Math.cos(base) * d, root[1] + Math.sin(base) * d];
  return [j, e, (Math.atan2(e[1] - j[1], e[0] - j[0]) * 180) / Math.PI];
}

export type Skeleton = {
  hip: Vec;
  shoulder: Vec;
  head: Vec;
  armN: Vec[];
  armF: Vec[];
  legN: Vec[];
  legF: Vec[];
};

export function solve(p: Pose): Skeleton {
  const shoulder = add(p.hip, p.torso, L.torso);
  const head = add(shoulder, p.head ?? p.torso, L.neckHead);
  const arm = (limb: Limb) => {
    const [e, h] = solveLimb(shoulder, limb, L.upper, L.fore);
    return [shoulder, e, h];
  };
  const leg = (limb: Limb, foot?: number) => {
    const [k, a, shinAngle] = solveLimb(p.hip, limb, L.thigh, L.shin);
    return [p.hip, k, a, add(a, foot ?? shinAngle - 90, L.foot)];
  };
  return {
    hip: p.hip,
    shoulder,
    head,
    armN: arm(p.armN),
    armF: arm(p.armF ?? p.armN),
    legN: leg(p.legN, p.footN),
    legF: leg(p.legF ?? p.legN, p.footF ?? p.footN),
  };
}

function lerpLimb(a: Limb, b: Limb, t: number): Limb {
  if ('a' in a && 'a' in b) return { a: [lerp(a.a[0], b.a[0], t), lerp(a.a[1], b.a[1], t)] };
  if ('ik' in a && 'ik' in b) return { ik: lerpV(a.ik, b.ik, t), bend: a.bend };
  return t < 0.5 ? a : b;
}
const opt = (a: number | undefined, b: number | undefined, t: number) =>
  a === undefined && b === undefined ? undefined : lerp(a ?? b!, b ?? a!, t);

export function lerpPose(a: Pose, b: Pose, t: number): Pose {
  return {
    hip: lerpV(a.hip, b.hip, t),
    torso: lerp(a.torso, b.torso, t),
    head: a.head === undefined && b.head === undefined ? undefined : lerp(a.head ?? a.torso, b.head ?? b.torso, t),
    armN: lerpLimb(a.armN, b.armN, t),
    armF: lerpLimb(a.armF ?? a.armN, b.armF ?? b.armN, t),
    legN: lerpLimb(a.legN, b.legN, t),
    legF: lerpLimb(a.legF ?? a.legN, b.legF ?? b.legN, t),
    footN: opt(a.footN, b.footN, t),
    footF: opt(a.footF ?? a.footN, b.footF ?? b.footN, t),
  };
}

const ease = (t: number) => 0.5 - Math.cos(Math.PI * t) / 2;

/** Pose at a loop phase in [0, 1). */
export function poseAt(anim: Anim, phase: number): Pose {
  const seq = anim.seq ?? anim.frames.map((_, i) => i);
  const times = anim.times ?? seq.map(() => 1);
  const total = times.reduce((s, v) => s + v, 0);
  let t = (((phase % 1) + 1) % 1) * total;
  let i = 0;
  while (i < seq.length - 1 && t >= times[i]) t -= times[i++];
  const local = t / times[i];
  const hold = anim.hold ?? 0.15;
  const k = ease(clamp((local - hold) / (1 - hold), 0, 1));
  return lerpPose(anim.frames[seq[i]], anim.frames[seq[(i + 1) % seq.length]], k);
}

const f = (n: number) => Math.round(n * 10) / 10;
export const poly = (pts: Vec[]) => pts.map((p, i) => `${i ? 'L' : 'M'}${f(p[0])} ${f(p[1])}`).join('');
export const HEAD_R = 6;

export type Box = { x: number; y: number; w: number; h: number };

/** Tight 4:3 view box around everything the animation ever touches. */
export function frameBox(anim: Anim): Box {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  const take = (x: number, y: number, r = 0) => {
    x0 = Math.min(x0, x - r); y0 = Math.min(y0, y - r);
    x1 = Math.max(x1, x + r); y1 = Math.max(y1, y + r);
  };
  for (let i = 0; i < 32; i++) {
    const s = solve(poseAt(anim, i / 32));
    for (const p of [s.hip, s.shoulder, ...s.armN, ...s.armF, ...s.legN, ...s.legF]) take(p[0], p[1], 4);
    take(s.head[0], s.head[1], HEAD_R + 1);
  }
  let floor = false;
  for (const p of anim.props) {
    if (p.k === 'floor') floor = true;
    else if (p.k === 'bar' || p.k === 'lowbar') take(p.x, p.y, 4);
    else if (p.k === 'pbars') { take(p.x1, p.y); take(p.x2, p.y); }
    else { take(p.x, p.y); take(p.x + p.w, p.y + ('h' in p ? p.h : 0)); }
  }
  if (floor) y1 = Math.max(y1, FLOOR + 2);
  const pad = 8;
  let w = x1 - x0 + pad * 2, h = y1 - y0 + pad * 2;
  // Keep a 4:3 frame and never zoom in more than ~1.6× so figures stay comparable.
  w = Math.max(w, h * (4 / 3), 100);
  h = w * (3 / 4);
  const cx = (x0 + x1) / 2;
  const bottom = floor ? FLOOR + 6 : y1 + pad;
  return { x: cx - w / 2, y: Math.min(bottom - h, y0 - pad), w, h };
}

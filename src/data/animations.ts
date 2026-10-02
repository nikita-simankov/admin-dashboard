// Keyframes for the exercise pictograms. See src/lib/figure.ts for the model.
// Coordinates live in a 160×120 box; the floor is at y = 110.
import type { Anim, Limb, Prop, Vec } from '../lib/figure';

const TORSO = 28;
const r = (d: number) => (d * Math.PI) / 180;
const deg = (a: number) => (a * 180) / Math.PI;

/** Straight body from an ankle to a shoulder: hip sits on that line. */
function line(ankle: Vec, shoulder: Vec): { hip: Vec; torso: number } {
  const dx = shoulder[0] - ankle[0], dy = shoulder[1] - ankle[1];
  const d = Math.hypot(dx, dy);
  return { hip: [shoulder[0] - (dx / d) * TORSO, shoulder[1] - (dy / d) * TORSO], torso: deg(Math.atan2(dy, dx)) };
}
/** Hip position for a given shoulder and torso angle. */
const below = (shoulder: Vec, torso: number): { hip: Vec; torso: number } => ({
  hip: [shoulder[0] - Math.cos(r(torso)) * TORSO, shoulder[1] - Math.sin(r(torso)) * TORSO],
  torso,
});
const ik = (x: number, y: number, bend: 1 | -1 = 1): Limb => ({ ik: [x, y], bend });
const a = (u: number, l: number): Limb => ({ a: [u, l] });

const floor: Prop = { k: 'floor' };
const BAR: Vec = [96, 12];
const bar: Prop = { k: 'bar', x: BAR[0], y: BAR[1] };
const hands = ik(BAR[0], BAR[1], 1);

// ---------- push ----------
const PU_ANKLE: Vec = [41, 104];
const PU_HAND = ik(97, 107, 1);
const pushUp: Anim = {
  props: [floor],
  dur: 2.4,
  frames: [
    { ...line(PU_ANKLE, [103.6, 80]), armN: PU_HAND, legN: ik(...PU_ANKLE, -1), footN: 112 },
    { ...line(PU_ANKLE, [108, 99.2]), head: -6, armN: PU_HAND, legN: ik(...PU_ANKLE, -1), footN: 112 },
  ],
};

const DEC_ANKLE: Vec = [42, 71];
const declinePushUp: Anim = {
  props: [floor, { k: 'box', x: 16, y: 76, w: 34 }],
  dur: 2.4,
  frames: [
    { ...line(DEC_ANKLE, [108.1, 82]), armN: ik(96, 107, 1), legN: ik(...DEC_ANKLE, -1), footN: 115 },
    { ...line(DEC_ANKLE, [104.2, 96]), head: 10, armN: ik(96, 107, 1), legN: ik(...DEC_ANKLE, -1), footN: 115 },
  ],
};

const PP_ANKLE: Vec = [40, 104];
const pseudoPlanche: Anim = {
  props: [floor],
  dur: 2.8,
  frames: [
    { ...line(PP_ANKLE, [103.6, 83]), armN: ik(90, 107, 1), legN: ik(...PP_ANKLE, -1), footN: 112 },
    { ...line(PP_ANKLE, [106.85, 99.5]), head: -6, armN: ik(90, 107, 1), legN: ik(...PP_ANKLE, -1), footN: 112 },
  ],
};

const explosive: Anim = {
  props: [floor],
  dur: 1.8,
  hold: 0.05,
  seq: [0, 1, 2, 1],
  times: [0.8, 0.6, 0.6, 1],
  frames: [
    { ...line(PU_ANKLE, [108, 99.2]), head: -6, armN: PU_HAND, legN: ik(...PU_ANKLE, -1), footN: 112 },
    { ...line(PU_ANKLE, [103.6, 80]), armN: PU_HAND, legN: ik(...PU_ANKLE, -1), footN: 112 },
    { ...line(PU_ANKLE, [98.7, 70]), armN: ik(95, 96, 1), legN: ik(...PU_ANKLE, -1), footN: 112 },
  ],
};

const DIP_HAND: Vec = [97, 50];
const dips: Anim = {
  props: [{ k: 'pbars', x1: 66, x2: 128, y: 52 }, floor],
  dur: 2.6,
  frames: [
    { ...below([97, 24], -84), armN: ik(...DIP_HAND, 1), legN: a(100, 140), legF: a(95, 132), footN: 160 },
    { ...below([106, 38], -60), armN: ik(...DIP_HAND, 1), legN: a(118, 150), legF: a(112, 142), footN: 165 },
  ],
};

const deepDips: Anim = {
  ...dips,
  frames: [dips.frames[0], { ...below([108, 43], -55), armN: ik(...DIP_HAND, 1), legN: a(122, 152), legF: a(115, 145), footN: 165 }],
};

const PK_ANKLE: Vec = [60, 104];
const pike: Anim = {
  props: [floor],
  dur: 2.6,
  frames: [
    { hip: [62.4, 65], torso: 49.7, armN: ik(98, 107, 1), legN: ik(...PK_ANKLE, -1), footN: 100 },
    { hip: [84, 72.6], torso: 50, head: 60, armN: ik(98, 107, 1), legN: ik(...PK_ANKLE, -1), footN: 100 },
  ],
};

const PKE_ANKLE: Vec = [50, 66];
const pikeElevated: Anim = {
  props: [floor, { k: 'box', x: 22, y: 71, w: 32 }],
  dur: 2.8,
  frames: [
    { hip: [82, 52], torso: 82, armN: ik(92, 107, 1), legN: ik(...PKE_ANKLE, -1), footN: 100 },
    { hip: [86.4, 68.7], torso: 70, head: 76, armN: ik(92, 107, 1), legN: ik(...PKE_ANKLE, -1), footN: 100 },
  ],
};

const benchDips: Anim = {
  props: [floor, { k: 'box', x: 18, y: 88, w: 34 }],
  dur: 2.4,
  frames: [
    { ...below([58, 60], -92), armN: ik(50, 86, 1), legN: ik(84, 106, -1), footN: 0 },
    { ...below([57, 77], -93), armN: ik(50, 86, 1), legN: ik(84, 106, -1), footN: 0 },
  ],
};

// ---------- pull ----------
const pullUp: Anim = {
  props: [bar],
  dur: 2.8,
  frames: [
    { ...below([93, 39], -88), armN: hands, legN: a(96, 102), legF: a(100, 110), footN: 150 },
    { ...below([88.5, 15.5], -98), head: -95, armN: hands, legN: a(104, 118), legF: a(108, 125), footN: 160 },
  ],
};

const chinUp: Anim = {
  ...pullUp,
  frames: [
    pullUp.frames[0],
    { ...below([89, 16], -95), head: -92, armN: hands, legN: a(100, 112), legF: a(104, 120), footN: 160 },
  ],
};

const slowChin: Anim = { ...chinUp, dur: 6, hold: 0.1 };

const lsitPullUp: Anim = {
  props: [bar],
  dur: 3,
  frames: [
    { ...below([93, 39], -88), armN: hands, legN: a(-4, -4), footN: -60 },
    { ...below([88.5, 16.5], -95), head: -93, armN: hands, legN: a(-6, -6), footN: -60 },
  ],
};

const legRaise: Anim = {
  props: [bar],
  dur: 2.8,
  frames: [
    { ...below([94, 39], -90), armN: hands, legN: a(92, 92), footN: 150 },
    { ...below([94, 39], -100), armN: hands, legN: a(-4, -4), footN: -50 },
  ],
};

const toesToBar: Anim = {
  props: [bar],
  dur: 3,
  frames: [
    { ...below([94, 39], -90), armN: hands, legN: a(92, 92), footN: 150 },
    { ...below([88, 38], -160), head: -172, armN: hands, legN: a(-116, -116), footN: -40 },
  ],
};

const deadHang: Anim = {
  props: [bar],
  dur: 4,
  hold: 0.25,
  frames: [
    { ...below([95, 39], -90), armN: hands, legN: a(92, 94), legF: a(94, 98), footN: 150 },
    { ...below([95.5, 38.5], -88), armN: hands, legN: a(86, 88), legF: a(88, 92), footN: 145 },
  ],
};

const AUS_BAR: Vec = [102, 62];
const AUS_HAND = ik(AUS_BAR[0], AUS_BAR[1] + 1, -1);
const AUS_ANKLE: Vec = [54, 104];
const aussie: Anim = {
  props: [floor, { k: 'lowbar', x: AUS_BAR[0], y: AUS_BAR[1] }],
  dur: 2.6,
  frames: [
    { ...line(AUS_ANKLE, [117, 86]), armN: AUS_HAND, legN: ik(...AUS_ANKLE, 1), footN: -70 },
    { ...line(AUS_ANKLE, [110, 68]), armN: AUS_HAND, legN: ik(...AUS_ANKLE, 1), footN: -70 },
  ],
};

const AUSE_ANKLE: Vec = [44, 76];
const aussieElevated: Anim = {
  props: [floor, { k: 'box', x: 16, y: 81, w: 34 }, { k: 'lowbar', x: AUS_BAR[0], y: AUS_BAR[1] }],
  dur: 2.8,
  frames: [
    { ...line(AUSE_ANKLE, [111, 82]), armN: AUS_HAND, legN: ik(...AUSE_ANKLE, 1), footN: -70 },
    { ...line(AUSE_ANKLE, [110, 67]), armN: AUS_HAND, legN: ik(...AUSE_ANKLE, 1), footN: -70 },
  ],
};

// ---------- legs + core ----------
const SQ_ANKLE: Vec = [80, 104];
const squat: Anim = {
  props: [floor],
  dur: 2.4,
  frames: [
    { hip: [80, 65.5], torso: -90, armN: a(94, 96), legN: ik(...SQ_ANKLE, -1), footN: 0 },
    { hip: [62, 88], torso: -52, head: -62, armN: a(-4, -4), legN: ik(...SQ_ANKLE, -1), footN: 0 },
  ],
};

const jumpSquat: Anim = {
  props: [floor],
  dur: 1.8,
  hold: 0.08,
  seq: [0, 1, 2, 1],
  times: [0.7, 0.45, 0.45, 0.8],
  frames: [
    { hip: [63, 87], torso: -54, head: -64, armN: a(130, 125), legN: ik(...SQ_ANKLE, -1), footN: 0 },
    { hip: [80, 65.5], torso: -86, armN: a(-40, -50), legN: ik(...SQ_ANKLE, -1), footN: 0 },
    { hip: [81, 59], torso: -88, armN: a(-70, -75), legN: ik(81, 98, -1), footN: 65 },
  ],
};

const BS_FRONT: Vec = [94, 104];
const BS_REAR: Vec = [40, 83];
const bulgarian: Anim = {
  props: [floor, { k: 'box', x: 14, y: 88, w: 32 }],
  dur: 2.6,
  frames: [
    { hip: [76, 67], torso: -86, armN: a(96, 98), legN: ik(...BS_FRONT, -1), legF: ik(...BS_REAR, -1), footN: 0, footF: 185 },
    { hip: [71, 88], torso: -80, armN: a(96, 98), legN: ik(...BS_FRONT, -1), legF: ik(...BS_REAR, -1), footN: 0, footF: 185 },
  ],
};

const PS_ANKLE: Vec = [90, 104];
const pistol: Anim = {
  props: [floor, { k: 'box', x: 46, y: 86, w: 26 }],
  dur: 3,
  frames: [
    { hip: [90, 65.5], torso: -88, armN: a(-2, -2), legN: ik(...PS_ANKLE, -1), legF: a(80, 82), footN: 0 },
    { hip: [69, 80], torso: -58, head: -66, armN: a(-8, -8), legN: ik(...PS_ANKLE, -1), legF: a(-6, -6), footN: 0, footF: -70 },
  ],
};

const GB_ANKLE: Vec = [102, 104];
const gluteBridge: Anim = {
  props: [floor],
  dur: 2.4,
  frames: [
    { hip: [72, 103], torso: 180, head: 180, armN: a(2, 2), legN: ik(...GB_ANKLE, -1), legF: a(-42, -42), footN: 0, footF: -40 },
    { hip: [70, 88], torso: 148, head: 182, armN: a(18, 6), legN: ik(...GB_ANKLE, -1), legF: a(-18, -18), footN: 0, footF: -20 },
  ],
};

const calfRaise: Anim = {
  props: [floor, { k: 'box', x: 80, y: 90, w: 40 }],
  dur: 2,
  frames: [
    { hip: [78.2, 50.4], torso: -90, armN: a(94, 96), legN: ik(78.6, 89.5, -1), legF: a(100, 160), footN: -22, footF: 190 },
    { hip: [80.3, 43.5], torso: -90, armN: a(94, 96), legN: ik(80.5, 82.2, -1), legF: a(100, 160), footN: 50, footF: 190 },
  ],
};

const PL_ANKLE: Vec = [30, 104];
const plank: Anim = {
  props: [floor],
  dur: 3.6,
  hold: 0.3,
  frames: [
    { ...line(PL_ANKLE, [95, 92]), armN: a(90, 0), legN: ik(...PL_ANKLE, -1), footN: 112 },
    { ...line(PL_ANKLE, [95, 91]), armN: a(88, 0), legN: ik(...PL_ANKLE, -1), footN: 112 },
  ],
};

const hollow: Anim = {
  props: [floor],
  dur: 3.6,
  hold: 0.3,
  frames: [
    { hip: [80, 102], torso: 196, head: 200, armN: a(196, 196), legN: a(-14, -14), footN: -40 },
    { hip: [80, 102], torso: 199, head: 203, armN: a(199, 199), legN: a(-17, -17), footN: -43 },
  ],
};

const ND_ANKLE: Vec = [51, 104];
const ndHip = (bodyAngle: number): Vec => [70 + Math.cos(r(bodyAngle)) * 20, 104 + Math.sin(r(bodyAngle)) * 20];
const nordic: Anim = {
  props: [floor, { k: 'pad', x: 42, y: 97, w: 16, h: 5 }],
  dur: 4.5,
  hold: 0.06,
  seq: [0, 1, 2, 1],
  times: [1.4, 1.4, 0.6, 0.6],
  frames: [
    { hip: ndHip(-90), torso: -90, armN: a(70, -110), legN: ik(...ND_ANKLE, -1), footN: 175 },
    { hip: ndHip(-58), torso: -58, armN: a(60, -100), legN: ik(...ND_ANKLE, -1), footN: 175 },
    { hip: ndHip(-30), torso: -30, armN: a(78, 84), legN: ik(...ND_ANKLE, -1), footN: 175 },
  ],
};

// ---------- recovery ----------
const stretch: Anim = {
  props: [floor],
  dur: 4.4,
  hold: 0.3,
  frames: [
    { hip: [72, 84], torso: -90, armN: a(-96, -96), legN: ik(100, 104, -1), legF: ik(53, 104, -1), footN: 0, footF: 180 },
    { hip: [80, 87], torso: -86, head: -92, armN: a(-100, -102), legN: ik(100, 104, -1), legF: ik(53, 104, -1), footN: 0, footF: 180 },
  ],
};

const jog: Anim = {
  props: [floor],
  dur: 0.9,
  hold: 0,
  frames: [
    { hip: [80, 64], torso: -82, armN: a(120, 40), armF: a(62, -20), legN: a(62, 98), legF: a(118, 160), footN: 10, footF: 210 },
    { hip: [80, 66], torso: -82, armN: a(92, 8), armF: a(88, 0), legN: a(88, 100), legF: a(70, 150), footN: 5, footF: 70 },
    { hip: [80, 64], torso: -82, armN: a(62, -20), armF: a(120, 40), legN: a(118, 160), legF: a(62, 98), footN: 210, footF: 10 },
    { hip: [80, 66], torso: -82, armN: a(88, 0), armF: a(92, 8), legN: a(70, 150), legF: a(88, 100), footN: 70, footF: 5 },
  ],
};

export const ANIMS = {
  pushUp, declinePushUp, pseudoPlanche, explosive, dips, deepDips, pike, pikeElevated, benchDips,
  pullUp, chinUp, slowChin, lsitPullUp, legRaise, toesToBar, deadHang, aussie, aussieElevated,
  squat, jumpSquat, bulgarian, pistol, gluteBridge, calfRaise, plank, hollow, nordic,
  stretch, jog,
} satisfies Record<string, Anim>;
export type AnimId = keyof typeof ANIMS;

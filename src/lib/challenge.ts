import { useData } from './store';
import { addDays, diffDays, type ISODate } from './date';
import { DEFAULT_START, MEALS, PAGES_GOAL, RULES, TOTAL_DAYS, WATER_GOAL, type RuleId } from '../data/plan';

export type Pause = { from: ISODate; to?: ISODate };
export type Attempt = {
  id: string;
  start: ISODate;
  end?: ISODate;
  reason?: string;
  lesson?: string;
  pauses: Pause[];
};
export type Settings = { attempts: Attempt[] };

export type DayLog = {
  done: Partial<Record<RuleId | 'clean', boolean>>;
  meals: boolean[];
  water: number;
  pages: number;
  note: string;
  tomorrow: string;
  weight?: number;
  excuse?: string;
};

export const emptyDay = (): DayLog => ({ done: {}, meals: MEALS.map(() => false), water: 0, pages: 0, note: '', tomorrow: '' });
export const defaultSettings = (): Settings => ({ attempts: [{ id: 'a1', start: DEFAULT_START, pauses: [] }] });

export const dayKey = (d: ISODate) => `day:${d}`;

export function ruleDone(log: DayLog, id: RuleId): boolean {
  switch (id) {
    case 'water': return log.water >= WATER_GOAL;
    case 'read': return log.pages >= PAGES_GOAL;
    case 'food': return log.meals.length === MEALS.length && log.meals.every(Boolean) && !!log.done.clean;
    default: return !!log.done[id];
  }
}
export function doneCount(log: DayLog): number {
  return RULES.reduce((n, r) => n + (ruleDone(log, r.id) ? 1 : 0), 0);
}
export const isComplete = (log: DayLog) => doneCount(log) === RULES.length;

export function isPaused(a: Attempt, d: ISODate): boolean {
  return a.pauses.some((p) => d >= p.from && (!p.to || d <= p.to));
}

/** Challenge day number (1-based) for a date within an attempt, or null if paused/out of range. */
export function dayNumber(a: Attempt, d: ISODate): number | null {
  if (d < a.start || (a.end && d > a.end) || isPaused(a, d)) return null;
  let paused = 0;
  for (const p of a.pauses) {
    if (p.from > d) continue;
    const to = p.to && p.to < d ? p.to : addDays(d, -1);
    if (to >= p.from) paused += diffDays(p.from, to) + 1;
  }
  return diffDays(a.start, d) - paused + 1;
}

/** Date for each challenge day number 1..90 (skipping paused dates). */
export function dayDates(a: Attempt): ISODate[] {
  const out: ISODate[] = [];
  let d = a.start;
  for (let guard = 0; out.length < TOTAL_DAYS && guard < 1000; guard++, d = addDays(d, 1)) {
    if (!isPaused(a, d)) out.push(d);
  }
  return out;
}

export function currentAttempt(s: Settings): Attempt {
  return s.attempts[s.attempts.length - 1];
}

export type ChallengeView = {
  settings: Settings;
  attempt: Attempt;
  dates: ISODate[];
  logFor: (d: ISODate) => DayLog;
};

/** Hook exposing settings + day logs; re-renders on any data change (data is tiny). */
export function useChallenge(): ChallengeView {
  const data = useData();
  const settings = (data.settings?.v as Settings | undefined) ?? defaultSettings();
  const attempt = currentAttempt(settings);
  return {
    settings,
    attempt,
    dates: dayDates(attempt),
    logFor: (d) => ({ ...emptyDay(), ...((data[dayKey(d)]?.v as DayLog | undefined) ?? {}) }),
  };
}

/** Past days in the current attempt that are not fully closed. */
export function openDays(view: ChallengeView, todayISO: ISODate): { date: ISODate; day: number; done: number }[] {
  const out = [];
  for (const [i, d] of view.dates.entries()) {
    if (d >= todayISO) break;
    const log = view.logFor(d);
    if (!isComplete(log)) out.push({ date: d, day: i + 1, done: doneCount(log) });
  }
  return out;
}

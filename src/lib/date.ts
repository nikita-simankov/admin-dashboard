// Dates are handled as local 'YYYY-MM-DD' strings to avoid timezone drift.
export type ISODate = string;

const pad = (n: number) => String(n).padStart(2, '0');

export function toISO(d: Date): ISODate {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
export function fromISO(s: ISODate): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}
export const today = (): ISODate => toISO(new Date());

export function addDays(s: ISODate, n: number): ISODate {
  const d = fromISO(s);
  d.setDate(d.getDate() + n);
  return toISO(d);
}
export function diffDays(a: ISODate, b: ISODate): number {
  return Math.round((fromISO(b).getTime() - fromISO(a).getTime()) / 86_400_000);
}

const WD = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];
const WD_LONG = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
const MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];

export const weekday = (s: ISODate) => fromISO(s).getDay();
export function formatLong(s: ISODate): string {
  const d = fromISO(s);
  return `${WD_LONG[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}
export function formatShort(s: ISODate): string {
  const d = fromISO(s);
  return `${WD[d.getDay()]} ${pad(d.getDate())}.${pad(d.getMonth() + 1)}`;
}
export function formatDM(s: ISODate): string {
  const d = fromISO(s);
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}`;
}

export function plural(n: number, one: string, few: string, many: string): string {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}

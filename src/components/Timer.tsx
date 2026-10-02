// A single global countdown (focus hour, workout, rest). Kept in localStorage
// as an absolute end time, so it survives reloads and backgrounding.
import { useEffect, useState, useSyncExternalStore } from 'react';
import { IconCheck, IconPause, IconPlay, IconX } from './Icons';

export type TimerState = {
  label: string;
  duration: number; // ms
  endsAt?: number; // set while running
  left?: number; // set while paused
  onDone?: () => void;
};

const LS = 'h90:timer';
let state: TimerState | null = (() => {
  try {
    return JSON.parse(localStorage.getItem(LS) ?? 'null');
  } catch {
    return null;
  }
})();
let doneHandler: (() => void) | undefined;
const subs = new Set<() => void>();
function set(next: TimerState | null) {
  state = next;
  try {
    if (next) localStorage.setItem(LS, JSON.stringify({ ...next, onDone: undefined }));
    else localStorage.removeItem(LS);
  } catch { /* ignore */ }
  subs.forEach((s) => s());
}

export function startTimer(label: string, minutes: number, onDone?: () => void) {
  doneHandler = onDone;
  const duration = minutes * 60_000;
  set({ label, duration, endsAt: Date.now() + duration });
}
export const stopTimer = () => set(null);

function fmt(ms: number) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}

export function TimerPill() {
  const t = useSyncExternalStore(
    (cb) => { subs.add(cb); return () => subs.delete(cb); },
    () => state,
  );
  const [now, setNow] = useState(() => Date.now());
  const running = !!t?.endsAt;
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [running]);

  const left = t ? (t.endsAt ? t.endsAt - now : t.left ?? 0) : 0;
  const finished = !!t?.endsAt && left <= 0;
  useEffect(() => {
    if (finished) navigator.vibrate?.([200, 100, 200]);
  }, [finished]);

  if (!t) return null;
  return (
    <div className={`timer-pill glass${finished ? ' done' : ''}`} role="timer" aria-live="polite">
      <div>
        <b>{finished ? 'Готово' : fmt(left)}</b>
        <div className="tiny">{t.label}</div>
      </div>
      {finished ? (
        <>
          {doneHandler && (
            <button className="pill-btn on" onClick={() => { doneHandler?.(); stopTimer(); }}>
              <IconCheck /> Отметить
            </button>
          )}
          <button className="icon-btn" aria-label="Закрыть таймер" onClick={stopTimer}><IconX /></button>
        </>
      ) : (
        <>
          <button
            className="icon-btn"
            aria-label={running ? 'Пауза' : 'Продолжить'}
            onClick={() => set(running ? { ...t, endsAt: undefined, left } : { ...t, endsAt: Date.now() + (t.left ?? 0), left: undefined })}
          >
            {running ? <IconPause /> : <IconPlay />}
          </button>
          <button className="icon-btn" aria-label="Остановить таймер" onClick={stopTimer}><IconX /></button>
        </>
      )}
    </div>
  );
}

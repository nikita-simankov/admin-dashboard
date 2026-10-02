// Offline-first key/value store. Every record carries its own timestamp;
// the client and server merge per key (last write wins), so the phone and
// the desktop can both edit and converge.
import { useCallback, useSyncExternalStore } from 'react';

type Rec = { v: unknown; t: number };
type Data = Record<string, Rec>;
export type SyncStatus = 'idle' | 'syncing' | 'offline' | 'error';
export type AuthState = 'unknown' | 'ok' | 'required' | 'local';

const LS_DATA = 'h90:data';
const LS_DIRTY = 'h90:dirty';

function readLS<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function writeLS(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable — the server copy is still the backup */
  }
}

let data: Data = readLS<Data>(LS_DATA, {});
const dirty = new Set<string>(readLS<string[]>(LS_DIRTY, []));
let meta = { status: 'idle' as SyncStatus, auth: 'unknown' as AuthState };
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

function save() {
  writeLS(LS_DATA, data);
  writeLS(LS_DIRTY, [...dirty]);
}
function setMeta(patch: Partial<typeof meta>) {
  meta = { ...meta, ...patch };
  emit();
}

export function getRecord<T>(key: string, fallback: T): T {
  return (data[key]?.v as T) ?? fallback;
}
export function setRecord<T>(key: string, value: T) {
  data = { ...data, [key]: { v: value, t: Date.now() } };
  dirty.add(key);
  save();
  emit();
  schedulePush();
}
export function keys(prefix: string): string[] {
  return Object.keys(data).filter((k) => k.startsWith(prefix));
}

export function useData(): Data {
  return useSyncExternalStore(subscribe, () => data);
}
export function useMeta() {
  return useSyncExternalStore(subscribe, () => meta);
}

export function useRecord<T>(key: string, fallback: T): [T, (next: T | ((prev: T) => T)) => void] {
  const rec = useSyncExternalStore(subscribe, () => data[key]);
  const value = (rec?.v as T) ?? fallback;
  const update = useCallback(
    (next: T | ((prev: T) => T)) => {
      const prev = getRecord(key, fallback);
      setRecord(key, typeof next === 'function' ? (next as (p: T) => T)(prev) : next);
    },
    // fallback is intentionally excluded: callers pass fresh literals
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key],
  );
  return [value, update];
}

// ---------- sync ----------
let pushTimer: ReturnType<typeof setTimeout> | undefined;
function schedulePush() {
  if (meta.auth !== 'ok') return;
  clearTimeout(pushTimer);
  pushTimer = setTimeout(push, 600);
}

async function push() {
  if (meta.auth !== 'ok' || dirty.size === 0) return;
  const sending = [...dirty];
  const records: Data = {};
  for (const k of sending) if (data[k]) records[k] = data[k];
  setMeta({ status: 'syncing' });
  try {
    const res = await fetch('/api/data', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ records }),
    });
    if (res.status === 401) return setMeta({ auth: 'required', status: 'idle' });
    if (!res.ok) throw new Error(String(res.status));
    for (const k of sending) if (data[k]?.t === records[k]?.t) dirty.delete(k);
    save();
    setMeta({ status: 'idle' });
    if (dirty.size) schedulePush();
  } catch {
    setMeta({ status: navigator.onLine ? 'error' : 'offline' });
  }
}

export async function pull() {
  if (meta.auth !== 'ok') return;
  setMeta({ status: 'syncing' });
  try {
    const res = await fetch('/api/data', { cache: 'no-store' });
    if (res.status === 401) return setMeta({ auth: 'required', status: 'idle' });
    if (!res.ok) throw new Error(String(res.status));
    const { records } = (await res.json()) as { records: Data };
    const next: Data = { ...data };
    for (const [k, rec] of Object.entries(records)) {
      const local = next[k];
      if (!local || rec.t > local.t) {
        next[k] = rec;
        dirty.delete(k);
      } else if (local.t > rec.t) {
        dirty.add(k);
      }
    }
    for (const k of Object.keys(next)) if (!(k in records)) dirty.add(k);
    data = next;
    save();
    setMeta({ status: 'idle' });
    emit();
    if (dirty.size) push();
  } catch {
    setMeta({ status: navigator.onLine ? 'error' : 'offline' });
  }
}

export async function initSession() {
  try {
    const res = await fetch('/api/session', { cache: 'no-store' });
    if (!res.ok) throw new Error();
    const s = (await res.json()) as { auth: boolean; ok: boolean };
    setMeta({ auth: s.ok ? 'ok' : 'required' });
    if (s.ok) await pull();
  } catch {
    // No server reachable (offline or static hosting): keep working locally.
    setMeta({ auth: 'local', status: 'offline' });
  }
}

export async function login(password: string): Promise<string | null> {
  const res = await fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    return (body as { error?: string }).error ?? 'Ошибка входа';
  }
  setMeta({ auth: 'ok' });
  await pull();
  return null;
}

export async function logout() {
  await fetch('/api/logout', { method: 'POST' }).catch(() => {});
  setMeta({ auth: 'required' });
}

export function exportAll(): string {
  return JSON.stringify({ exportedAt: new Date().toISOString(), records: data }, null, 2);
}
export function importAll(json: string) {
  const parsed = JSON.parse(json) as { records?: Data };
  if (!parsed.records || typeof parsed.records !== 'object') throw new Error('Неверный файл');
  const now = Date.now();
  data = {};
  for (const [k, rec] of Object.entries(parsed.records)) {
    data[k] = { v: rec.v, t: now };
    dirty.add(k);
  }
  save();
  emit();
  schedulePush();
}

if (typeof window !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') pull();
    else push();
  });
  window.addEventListener('online', () => pull());
}

import { useState } from 'react';
import { APPS_TARGET, APP_STATUSES, BOOKS, PAGES_TARGET, WEEKS, type AppStatus } from '../data/plan';
import { useChallenge } from '../lib/challenge';
import { formatDM, today, type ISODate } from '../lib/date';
import { useData, useRecord } from '../lib/store';
import { IconLink, IconPlus, IconTrash } from '../components/Icons';

type Application = { id: string; company: string; position: string; date: ISODate; link: string; status: AppStatus };
type BookState = 'todo' | 'reading' | 'done';

const STATUS_CHIP: Record<AppStatus, string> = {
  Отправлен: '', Тестовое: 'blue', Собеседование: 'accent', Оффер: 'ok', Отказ: 'warn',
};

export function Career({ header }: { header: React.ReactNode }) {
  const view = useChallenge();
  const now = today();
  const dayIdx = view.dates.findIndex((d) => d === now);
  const currentWeek = dayIdx >= 0 ? Math.floor(dayIdx / 7) : view.dates[0] > now ? -1 : WEEKS.length;

  return (
    <div className="page">
      <header className="topbar glass">
        <h1>Карьера<span className="sub">Junior-разработчик · TypeScript, React, Node.js</span></h1>
        {header}
      </header>

      <div className="banner blue">
        <IconLink style={{ color: 'var(--blue)' }} />
        <div className="small">Контракт заканчивается <b style={{ display: 'inline' }}>25 декабря</b> — к этой дате портфолио и резюме должны быть готовы, а отклики уже идти.</div>
      </div>

      <div className="cols">
        <div className="stack">
          <Applications />
          <Reading />
        </div>
        <section className="card flush">
          <div className="card-title" style={{ padding: '16px 16px 0' }}><h2>Трек по неделям</h2></div>
          <ul className="list">
            {WEEKS.map((w, i) => {
              const from = view.dates[i * 7];
              const to = view.dates[Math.min(i * 7 + 6, view.dates.length - 1)];
              const cls = i === currentWeek ? 'current' : i < currentWeek ? 'past' : '';
              return (
                <li key={w} className={cls}>
                  <span className="num-badge">{i + 1}</span>
                  <div className="grow">
                    <div className="title">{w}</div>
                    {from && <div className="meta">{formatDM(from)}–{to ? formatDM(to) : '…'}</div>}
                  </div>
                  {i === currentWeek && <span className="chip accent">Сейчас</span>}
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </div>
  );
}

function Applications() {
  const [apps, setApps] = useRecord<Application[]>('apps', []);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ company: '', position: '', link: '' });
  const add = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.company.trim()) return;
    setApps((prev) => [{ id: Date.now().toString(36), date: today(), status: 'Отправлен', ...draft }, ...prev]);
    setDraft({ company: '', position: '', link: '' });
    setAdding(false);
  };
  const patch = (id: string, p: Partial<Application>) => setApps((prev) => prev.map((a) => (a.id === id ? { ...a, ...p } : a)));
  const counts = APP_STATUSES.map((s) => [s, apps.filter((a) => a.status === s).length] as const).filter(([, n]) => n > 0);

  return (
    <section className="card flush">
      <div style={{ padding: 16 }}>
        <div className="card-title">
          <h2>Отклики</h2>
          <button className="pill-btn accent" onClick={() => setAdding((v) => !v)}><IconPlus /> Отклик</button>
        </div>
        <div className="row" style={{ alignItems: 'baseline' }}>
          <span style={{ font: '800 30px/1 var(--font-display)', letterSpacing: '-0.03em' }}>{apps.length}</span>
          <span className="muted small">из {APPS_TARGET}</span>
          <span className="spacer" />
          {counts.map(([s, n]) => <span key={s} className={`chip ${STATUS_CHIP[s]}`}>{s} {n}</span>)}
        </div>
        <div className="bar"><i style={{ width: `${Math.min(100, (apps.length / APPS_TARGET) * 100)}%` }} /></div>
        {adding && (
          <form className="form-grid" style={{ marginTop: 14 }} onSubmit={add}>
            <div className="form-grid two">
              <input className="input" placeholder="Компания" value={draft.company} onChange={(e) => setDraft({ ...draft, company: e.target.value })} autoFocus />
              <input className="input" placeholder="Позиция" value={draft.position} onChange={(e) => setDraft({ ...draft, position: e.target.value })} />
            </div>
            <input className="input" placeholder="Ссылка на вакансию" inputMode="url" value={draft.link} onChange={(e) => setDraft({ ...draft, link: e.target.value })} />
            <div className="row">
              <button className="btn primary" type="submit" disabled={!draft.company.trim()}>Добавить</button>
              <button className="btn ghost" type="button" onClick={() => setAdding(false)}>Отмена</button>
            </div>
          </form>
        )}
      </div>
      {apps.length === 0 ? (
        <div className="empty" style={{ borderTop: '1px solid var(--line)' }}>Пока пусто. Отклики стартуют на неделе 9 — компания, позиция, дата, ссылка, статус.</div>
      ) : (
        <ul className="list" style={{ borderTop: '1px solid var(--line)' }}>
          {apps.map((a) => (
            <li key={a.id}>
              <div className="grow">
                <div className="title">
                  {a.link ? <a href={safeUrl(a.link)} target="_blank" rel="noreferrer noopener">{a.company}</a> : a.company}
                </div>
                <div className="meta">{[a.position, formatDM(a.date)].filter(Boolean).join(' · ')}</div>
              </div>
              <select className="select" style={{ width: 'auto', minHeight: 34, padding: '4px 8px', fontSize: 13 }} value={a.status}
                aria-label={`Статус: ${a.company}`} onChange={(e) => patch(a.id, { status: e.target.value as AppStatus })}>
                {APP_STATUSES.map((s) => <option key={s}>{s}</option>)}
              </select>
              <button className="icon-btn" aria-label={`Удалить ${a.company}`}
                onClick={() => confirm(`Удалить отклик «${a.company}»?`) && setApps((p) => p.filter((x) => x.id !== a.id))}>
                <IconTrash width={18} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function safeUrl(link: string) {
  const url = /^https?:\/\//i.test(link) ? link : `https://${link}`;
  try {
    return new URL(url).href;
  } catch {
    return undefined;
  }
}

function Reading() {
  const data = useData();
  const [books, setBooks] = useRecord<Record<string, BookState>>('books', {});
  let pages = 0;
  for (const [k, rec] of Object.entries(data)) if (k.startsWith('day:')) pages += (rec.v as { pages?: number }).pages ?? 0;
  const next: Record<BookState, BookState> = { todo: 'reading', reading: 'done', done: 'todo' };
  const label: Record<BookState, string> = { todo: 'Не начата', reading: 'Читаю', done: 'Прочитана' };
  return (
    <section className="card flush">
      <div style={{ padding: 16 }}>
        <div className="card-title"><h2>Список чтения</h2><span className="chip blue">{pages} / {PAGES_TARGET} стр.</span></div>
        <p className="tiny">10 страниц в день — около 900 страниц за 90 дней. Нажми на статус, чтобы сменить.</p>
        <div className="bar blue"><i style={{ width: `${Math.min(100, (pages / PAGES_TARGET) * 100)}%` }} /></div>
      </div>
      <ul className="list" style={{ borderTop: '1px solid var(--line)' }}>
        {BOOKS.map((b) => {
          const s = books[b.id] ?? 'todo';
          return (
            <li key={b.id}>
              <div className="grow">
                <div className="title">{b.title}</div>
                <div className="meta">{b.author}</div>
              </div>
              <button className={`chip ${s === 'done' ? 'ok' : s === 'reading' ? 'accent' : ''}`} style={{ minHeight: 30 }}
                onClick={() => setBooks((p) => ({ ...p, [b.id]: next[s] }))}>{label[s]}</button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

import { useState } from 'react';
import {
  APPS_TARGET, APP_STATUSES, BOOKS, BOOK_AREAS, PAGES_TARGET, WEEKS, type AppStatus, type Book, type BookArea,
} from '../data/plan';
import { useChallenge } from '../lib/challenge';
import { formatDM, today, type ISODate } from '../lib/date';
import { useData, useRecord } from '../lib/store';
import { PageHeader, toRoman } from '../components/Ornaments';
import { IconPlus, IconTrash } from '../components/Icons';

type Application = { id: string; company: string; position: string; date: ISODate; link: string; status: AppStatus };
type BookState = 'todo' | 'reading' | 'done';
type CheckId = 'readme' | 'shots' | 'run' | 'tests' | 'live';
type Project = { id: string; name: string; link: string; checks: Partial<Record<CheckId, boolean>> };
type Section = 'books' | 'projects' | 'apps' | 'track';

const SECTIONS: [Section, string][] = [['books', 'Библиотека'], ['projects', 'Проекты'], ['apps', 'Отклики'], ['track', 'Трек']];
const CHECKS: [CheckId, string][] = [
  ['readme', 'README'], ['shots', 'Скриншоты'], ['run', 'Запуск'], ['tests', 'Тесты'], ['live', 'Публичный URL'],
];
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const LS_SECTION = 'h90:growth-section';

export function Growth({ sync }: { sync: React.ReactNode }) {
  const [section, setSectionState] = useState<Section>(() => {
    try { return (localStorage.getItem(LS_SECTION) as Section) || 'books'; } catch { return 'books'; }
  });
  const setSection = (s: Section) => {
    setSectionState(s);
    try { localStorage.setItem(LS_SECTION, s); } catch { /* ignore */ }
  };
  return (
    <div className="page">
      <PageHeader over={<>Книги, труды, карьера{sync}</>} title="Путь" />
      <div className="tabs" role="tablist" aria-label="Раздел">
        {SECTIONS.map(([id, label]) => (
          <button key={id} role="tab" aria-selected={section === id} aria-pressed={section === id} onClick={() => setSection(id)}>{label}</button>
        ))}
      </div>
      {section === 'books' && <Library />}
      {section === 'projects' && <Projects />}
      {section === 'apps' && <Applications />}
      {section === 'track' && <Track />}
    </div>
  );
}

// ---------- library ----------
function Library() {
  const data = useData();
  const [states, setStates] = useRecord<Record<string, BookState>>('books', {});
  const [custom, setCustom] = useRecord<Book[]>('books:custom', []);
  const [area, setArea] = useState<BookArea | 'all' | 'mine'>('all');
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<{ title: string; author: string; area: BookArea }>({ title: '', author: '', area: 'habits' });

  let pages = 0;
  for (const [k, rec] of Object.entries(data)) if (k.startsWith('day:')) pages += (rec.v as { pages?: number }).pages ?? 0;
  const all = [...BOOKS, ...custom];
  const reading = all.filter((b) => states[b.id] === 'reading');
  const finished = all.filter((b) => states[b.id] === 'done').length;
  const shown = area === 'all' ? all : area === 'mine' ? custom : all.filter((b) => b.area === area);
  const next: Record<BookState, BookState> = { todo: 'reading', reading: 'done', done: 'todo' };
  const label: Record<BookState, string> = { todo: 'Хочу', reading: 'Читаю', done: 'Прочитана' };
  const add = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.title.trim()) return;
    const book: Book = { id: `c-${uid()}`, title: draft.title.trim(), author: draft.author.trim(), area: draft.area, note: '' };
    setCustom((prev) => [...prev, book]);
    setStates((p) => ({ ...p, [book.id]: 'reading' }));
    setDraft({ title: '', author: '', area: draft.area });
    setAdding(false);
  };

  return (
    <>
      <div className="summary">
        <span className="big">{pages}</span>
        <span className="label">из {PAGES_TARGET} страниц · прочитано книг: {finished}</span>
        <div className="bar"><i style={{ width: `${Math.min(100, (pages / PAGES_TARGET) * 100)}%` }} /></div>
        {reading.length > 0 && (
          <p className="italic muted" style={{ fontSize: 19, marginTop: 10 }}>
            Сейчас: {reading.map((b) => `«${b.title}»`).join(', ')}
          </p>
        )}
      </div>

      <div className="chips" role="group" aria-label="Сфера жизни">
        <button aria-pressed={area === 'all'} onClick={() => setArea('all')}>Все</button>
        {(Object.keys(BOOK_AREAS) as BookArea[]).map((a) => (
          <button key={a} aria-pressed={area === a} onClick={() => setArea(a)}>{BOOK_AREAS[a]}</button>
        ))}
        {custom.length > 0 && <button aria-pressed={area === 'mine'} onClick={() => setArea('mine')}>Мои</button>}
      </div>

      <ul className="list">
        {shown.map((b) => {
          const st = states[b.id] ?? 'todo';
          return (
            <li key={b.id}>
              <div className="grow">
                <div className="title">{b.title}{b.en && <span className="lang">EN</span>}</div>
                <div className="meta">{b.author}</div>
                {b.note && <div className="note">{b.note}</div>}
              </div>
              {b.id.startsWith('c-') && (
                <button className="icon-btn" aria-label={`Удалить ${b.title}`} onClick={() => confirm(`Удалить «${b.title}»?`) && setCustom((p) => p.filter((x) => x.id !== b.id))}>
                  <IconTrash width={17} />
                </button>
              )}
              <button className={`status${st === 'done' ? ' on' : st === 'reading' ? ' reading' : ''}`}
                aria-label={`${b.title}: ${label[st]}. Сменить статус`} onClick={() => setStates((p) => ({ ...p, [b.id]: next[st] }))}>
                <span className="diamond" />{label[st]}
              </button>
            </li>
          );
        })}
      </ul>

      {adding ? (
        <form className="form" onSubmit={add}>
          <div className="two">
            <label className="field"><span className="label">Название</span><input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} autoFocus /></label>
            <label className="field"><span className="label">Автор</span><input value={draft.author} onChange={(e) => setDraft({ ...draft, author: e.target.value })} /></label>
          </div>
          <label className="field">
            <span className="label">Сфера</span>
            <select value={draft.area} onChange={(e) => setDraft({ ...draft, area: e.target.value as BookArea })}>
              {(Object.keys(BOOK_AREAS) as BookArea[]).map((a) => <option key={a} value={a}>{BOOK_AREAS[a]}</option>)}
            </select>
          </label>
          <div className="row">
            <button className="btn gold" type="submit" disabled={!draft.title.trim()}>Добавить</button>
            <button className="btn quiet" type="button" onClick={() => setAdding(false)}>Отмена</button>
          </div>
        </form>
      ) : (
        <div className="row center"><button className="btn" onClick={() => setAdding(true)}><IconPlus /> Своя книга</button></div>
      )}
    </>
  );
}

// ---------- projects ----------
function Projects() {
  const [projects, setProjects] = useRecord<Project[]>('projects', []);
  const [draft, setDraft] = useState({ name: '', link: '' });
  const [adding, setAdding] = useState(false);
  const ready = projects.filter((p) => CHECKS.every(([c]) => p.checks[c])).length;
  const add = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.name.trim()) return;
    setProjects((prev) => [...prev, { id: uid(), name: draft.name.trim(), link: draft.link.trim(), checks: {} }]);
    setDraft({ name: '', link: '' });
    setAdding(false);
  };
  const patch = (id: string, fn: (p: Project) => Project) => setProjects((prev) => prev.map((p) => (p.id === id ? fn(p) : p)));

  return (
    <>
      <div className="summary">
        <span className="big">{ready}</span>
        <span className="label">из 2–3 проектов готовы к показу</span>
        <p className="tiny" style={{ maxWidth: 380 }}>Проекты меняются — добавляй и убирай их здесь. Готов к показу, когда отмечены все пять пунктов.</p>
      </div>

      {projects.length > 0 && (
        <ul className="list">
          {projects.map((p, i) => {
            const done = CHECKS.filter(([c]) => p.checks[c]).length;
            return (
              <li key={p.id} className="stack-item">
                <div className="row" style={{ flexWrap: 'nowrap', alignItems: 'baseline' }}>
                  <span className="rule-num">{toRoman(i + 1)}</span>
                  <div className="grow">
                    <input className="title" style={{ width: '100%', border: 0, background: 'none', padding: 0 }} value={p.name}
                      aria-label="Название проекта" onChange={(e) => patch(p.id, (x) => ({ ...x, name: e.target.value }))} />
                    {p.link && <a className="meta" href={safeUrl(p.link)} target="_blank" rel="noreferrer noopener">{p.link.replace(/^https?:\/\//, '')}</a>}
                  </div>
                  <span className="label" style={{ color: done === CHECKS.length ? 'var(--gold)' : undefined }}>{done}/{CHECKS.length}</span>
                  <button className="icon-btn" aria-label={`Удалить ${p.name}`} onClick={() => confirm(`Удалить проект «${p.name}»?`) && setProjects((prev) => prev.filter((x) => x.id !== p.id))}>
                    <IconTrash width={17} />
                  </button>
                </div>
                <div className="toggles" style={{ paddingLeft: 48 }}>
                  {CHECKS.map(([c, l]) => (
                    <button key={c} className={`toggle${p.checks[c] ? ' on' : ''}`} aria-pressed={!!p.checks[c]}
                      onClick={() => patch(p.id, (x) => ({ ...x, checks: { ...x.checks, [c]: !x.checks[c] } }))}>
                      <span className="diamond" />{l}
                    </button>
                  ))}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {adding ? (
        <form className="form" onSubmit={add}>
          <label className="field"><span className="label">Название</span><input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} autoFocus /></label>
          <label className="field"><span className="label">Репозиторий</span><input inputMode="url" placeholder="github.com/…" value={draft.link} onChange={(e) => setDraft({ ...draft, link: e.target.value })} /></label>
          <div className="row">
            <button className="btn gold" type="submit" disabled={!draft.name.trim()}>Добавить</button>
            <button className="btn quiet" type="button" onClick={() => setAdding(false)}>Отмена</button>
          </div>
        </form>
      ) : (
        <div className="row center"><button className="btn" onClick={() => setAdding(true)}><IconPlus /> Проект</button></div>
      )}
    </>
  );
}

// ---------- applications ----------
function Applications() {
  const [apps, setApps] = useRecord<Application[]>('apps', []);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ company: '', position: '', link: '' });
  const add = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.company.trim()) return;
    setApps((prev) => [{ id: uid(), date: today(), status: 'Отправлен', ...draft }, ...prev]);
    setDraft({ company: '', position: '', link: '' });
    setAdding(false);
  };
  const patch = (id: string, p: Partial<Application>) => setApps((prev) => prev.map((a) => (a.id === id ? { ...a, ...p } : a)));

  return (
    <>
      <div className="summary">
        <span className="big">{apps.length}</span>
        <span className="label">из {APPS_TARGET} откликов</span>
        <div className="bar"><i style={{ width: `${Math.min(100, (apps.length / APPS_TARGET) * 100)}%` }} /></div>
        <p className="tiny" style={{ marginTop: 8 }}>Контракт заканчивается 25 декабря — к этой дате отклики уже должны идти.</p>
      </div>

      {apps.length > 0 && (
        <ul className="list">
          {apps.map((a) => (
            <li key={a.id}>
              <div className="grow">
                <div className="title">{a.link ? <a href={safeUrl(a.link)} target="_blank" rel="noreferrer noopener" style={{ color: 'inherit' }}>{a.company}</a> : a.company}</div>
                <div className="meta">{[a.position, formatDM(a.date)].filter(Boolean).join(' · ')}</div>
              </div>
              <label className="field" style={{ width: 132 }}>
                <select value={a.status} aria-label={`Статус: ${a.company}`} onChange={(e) => patch(a.id, { status: e.target.value as AppStatus })}
                  style={{ fontSize: 15, color: a.status === 'Оффер' ? 'var(--gold)' : a.status === 'Отказ' ? 'var(--ink-3)' : undefined }}>
                  {APP_STATUSES.map((s) => <option key={s}>{s}</option>)}
                </select>
              </label>
              <button className="icon-btn" aria-label={`Удалить ${a.company}`} onClick={() => confirm(`Удалить отклик «${a.company}»?`) && setApps((p) => p.filter((x) => x.id !== a.id))}>
                <IconTrash width={17} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {adding ? (
        <form className="form" onSubmit={add}>
          <div className="two">
            <label className="field"><span className="label">Компания</span><input value={draft.company} onChange={(e) => setDraft({ ...draft, company: e.target.value })} autoFocus /></label>
            <label className="field"><span className="label">Позиция</span><input value={draft.position} onChange={(e) => setDraft({ ...draft, position: e.target.value })} /></label>
          </div>
          <label className="field"><span className="label">Ссылка на вакансию</span><input inputMode="url" value={draft.link} onChange={(e) => setDraft({ ...draft, link: e.target.value })} /></label>
          <div className="row">
            <button className="btn gold" type="submit" disabled={!draft.company.trim()}>Добавить</button>
            <button className="btn quiet" type="button" onClick={() => setAdding(false)}>Отмена</button>
          </div>
        </form>
      ) : (
        <div className="row center"><button className="btn" onClick={() => setAdding(true)}><IconPlus /> Отклик</button></div>
      )}
    </>
  );
}

// ---------- track ----------
function Track() {
  const view = useChallenge();
  const now = today();
  const dayIdx = view.dates.findIndex((d) => d === now);
  const currentWeek = dayIdx >= 0 ? Math.floor(dayIdx / 7) : view.dates[0] > now ? -1 : WEEKS.length;
  return (
    <>
      <p className="epigraph">Одно направление на девяносто дней: junior-разработчик — TypeScript, React, Node.js.</p>
      <ul className="list">
        {WEEKS.map((w, i) => {
          const from = view.dates[i * 7];
          const to = view.dates[Math.min(i * 7 + 6, view.dates.length - 1)];
          return (
            <li key={w} className={i === currentWeek ? 'current' : i < currentWeek ? 'past' : ''}>
              <span className="rule-num">{toRoman(i + 1)}</span>
              <div className="grow">
                <div className="title">{w}</div>
                {from && <div className="meta">{formatDM(from)} — {to ? formatDM(to) : '…'}</div>}
              </div>
            </li>
          );
        })}
      </ul>
    </>
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

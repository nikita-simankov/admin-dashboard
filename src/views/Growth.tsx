import { useState } from 'react';
import {
  APPS_TARGET, APP_STATUSES, BOOKS, BOOK_AREAS, PAGES_TARGET, WEEKS, type AppStatus, type Book, type BookArea,
} from '../data/plan';
import { useChallenge } from '../lib/challenge';
import { formatDM, today, type ISODate } from '../lib/date';
import { useData, useRecord } from '../lib/store';
import { IconCheck, IconLink, IconPlus, IconTrash } from '../components/Icons';

type Application = { id: string; company: string; position: string; date: ISODate; link: string; status: AppStatus };
type BookState = 'todo' | 'reading' | 'done';
type Project = { id: string; name: string; link: string; checks: Partial<Record<CheckId, boolean>> };
type CheckId = 'readme' | 'shots' | 'run' | 'tests' | 'live';
type Section = 'books' | 'projects' | 'apps' | 'track';

const SECTIONS: [Section, string][] = [['books', 'Книги'], ['projects', 'Проекты'], ['apps', 'Отклики'], ['track', 'Трек']];
const CHECKS: [CheckId, string][] = [
  ['readme', 'README'], ['shots', 'Скриншоты или демо'], ['run', 'Инструкция запуска'], ['tests', 'Тесты'], ['live', 'Публичный URL'],
];
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

const STATUS_CHIP: Record<AppStatus, string> = {
  Отправлен: '', Тестовое: 'blue', Собеседование: 'accent', Оффер: 'ok', Отказ: 'warn',
};

const LS_SECTION = 'h90:growth-section';

export function Growth({ header }: { header: React.ReactNode }) {
  const [section, setSectionState] = useState<Section>(() => {
    try { return (localStorage.getItem(LS_SECTION) as Section) || 'books'; } catch { return 'books'; }
  });
  const setSection = (s: Section) => {
    setSectionState(s);
    try { localStorage.setItem(LS_SECTION, s); } catch { /* ignore */ }
  };
  return (
    <div className="page narrow">
      <header className="topbar glass">
        <h1>Развитие<span className="sub">Книги, проекты, карьера</span></h1>
        {header}
      </header>
      <div className="seg" role="tablist" aria-label="Раздел">
        {SECTIONS.map(([id, label]) => (
          <button key={id} role="tab" aria-selected={section === id} aria-pressed={section === id} onClick={() => setSection(id)}>{label}</button>
        ))}
      </div>
      {section === 'books' && <Reading />}
      {section === 'projects' && <Projects />}
      {section === 'apps' && (
        <>
          <div className="banner blue">
            <IconLink style={{ color: 'var(--blue)' }} />
            <div className="small">Контракт заканчивается <b style={{ display: 'inline' }}>25 декабря</b> — к этой дате портфолио и резюме должны быть готовы, а отклики уже идти.</div>
          </div>
          <Applications />
        </>
      )}
      {section === 'track' && <Track />}
    </div>
  );
}

function Track() {
  const view = useChallenge();
  const now = today();
  const dayIdx = view.dates.findIndex((d) => d === now);
  const currentWeek = dayIdx >= 0 ? Math.floor(dayIdx / 7) : view.dates[0] > now ? -1 : WEEKS.length;
  return (
    <section className="card flush">
      <div style={{ padding: '16px 16px 0' }}>
        <div className="card-title"><h2>Трек по неделям</h2></div>
        <p className="tiny" style={{ marginBottom: 12 }}>Направление на 90 дней: junior-разработчик (TypeScript, React, Node.js). Конкретные задачи дня можно переписать на экране «Сегодня».</p>
      </div>
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
  );
}

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
  const toggle = (id: string, c: CheckId) =>
    setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, checks: { ...p.checks, [c]: !p.checks[c] } } : p)));

  return (
    <>
      <section className="card">
        <div className="card-title">
          <h2>Портфолио</h2>
          <button className="pill-btn accent" onClick={() => setAdding((v) => !v)}><IconPlus /> Проект</button>
        </div>
        <div className="row" style={{ alignItems: 'baseline' }}>
          <span className="big-num">{ready}</span>
          <span className="muted small">из 2–3 проектов готовы к показу</span>
        </div>
        <p className="tiny" style={{ marginTop: 8 }}>Проекты меняются — добавляй, переименовывай и убирай их здесь. Готов к показу = все пункты отмечены.</p>
        {adding && (
          <form className="form-grid" style={{ marginTop: 14 }} onSubmit={add}>
            <input className="input" placeholder="Название проекта" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} autoFocus />
            <input className="input" placeholder="Ссылка на репозиторий" inputMode="url" value={draft.link} onChange={(e) => setDraft({ ...draft, link: e.target.value })} />
            <div className="row">
              <button className="btn primary" type="submit" disabled={!draft.name.trim()}>Добавить</button>
              <button className="btn ghost" type="button" onClick={() => setAdding(false)}>Отмена</button>
            </div>
          </form>
        )}
      </section>
      {projects.length === 0 && !adding && (
        <div className="card empty">Пока нет проектов. Добавь то, над чем работаешь сейчас, — пункты чек-листа подскажут, чего не хватает до витрины.</div>
      )}
      {projects.map((p) => {
        const done = CHECKS.filter(([c]) => p.checks[c]).length;
        return (
          <section className="card" key={p.id}>
            <div className="row" style={{ flexWrap: 'nowrap' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <input className="inline-title" value={p.name} aria-label="Название проекта"
                  onChange={(e) => setProjects((prev) => prev.map((x) => (x.id === p.id ? { ...x, name: e.target.value } : x)))} />
                {p.link && <a className="small" href={safeUrl(p.link)} target="_blank" rel="noreferrer noopener">{p.link.replace(/^https?:\/\//, '')}</a>}
              </div>
              <span className={`chip ${done === CHECKS.length ? 'ok' : ''}`}>{done}/{CHECKS.length}</span>
              <button className="icon-btn" aria-label={`Удалить ${p.name}`} onClick={() => confirm(`Удалить проект «${p.name}»?`) && setProjects((prev) => prev.filter((x) => x.id !== p.id))}>
                <IconTrash width={18} />
              </button>
            </div>
            <div className="bar ok"><i style={{ width: `${(done / CHECKS.length) * 100}%` }} /></div>
            <div className="inline-controls">
              {CHECKS.map(([c, label]) => (
                <button key={c} className={`pill-btn${p.checks[c] ? ' on' : ''}`} aria-pressed={!!p.checks[c]} onClick={() => toggle(p.id, c)}>
                  {p.checks[c] && <IconCheck />}{label}
                </button>
              ))}
            </div>
          </section>
        );
      })}
    </>
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
          <span className="big-num">{apps.length}</span>
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
    setArea('mine');
  };

  return (
    <>
      <section className="card">
        <div className="card-title">
          <h2>Чтение</h2>
          <button className="pill-btn accent" onClick={() => setAdding((v) => !v)}><IconPlus /> Своя книга</button>
        </div>
        <div className="row" style={{ alignItems: 'baseline' }}>
          <span className="big-num">{pages}</span>
          <span className="muted small">из {PAGES_TARGET} страниц</span>
          <span className="spacer" />
          <span className="chip ok">Прочитано: {finished}</span>
        </div>
        <div className="bar blue"><i style={{ width: `${Math.min(100, (pages / PAGES_TARGET) * 100)}%` }} /></div>
        <p className="tiny" style={{ marginTop: 8 }}>10 страниц нехудожественной книги в день. Страницы отмечаются на экране «Сегодня».</p>
        {reading.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <div className="tiny" style={{ marginBottom: 6 }}>Сейчас читаю</div>
            {reading.map((b) => <div key={b.id} className="small"><b style={{ fontWeight: 650 }}>{b.title}</b> <span className="muted">— {b.author}</span></div>)}
          </div>
        )}
        {adding && (
          <form className="form-grid" style={{ marginTop: 14 }} onSubmit={add}>
            <div className="form-grid two">
              <input className="input" placeholder="Название" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} autoFocus />
              <input className="input" placeholder="Автор" value={draft.author} onChange={(e) => setDraft({ ...draft, author: e.target.value })} />
            </div>
            <select className="select" value={draft.area} onChange={(e) => setDraft({ ...draft, area: e.target.value as BookArea })} aria-label="Сфера">
              {(Object.keys(BOOK_AREAS) as BookArea[]).map((a) => <option key={a} value={a}>{BOOK_AREAS[a]}</option>)}
            </select>
            <div className="row">
              <button className="btn primary" type="submit" disabled={!draft.title.trim()}>Добавить и начать читать</button>
              <button className="btn ghost" type="button" onClick={() => setAdding(false)}>Отмена</button>
            </div>
          </form>
        )}
      </section>

      <div className="filters" role="group" aria-label="Сфера жизни">
        <button aria-pressed={area === 'all'} onClick={() => setArea('all')}>Все <small>{all.length}</small></button>
        {(Object.keys(BOOK_AREAS) as BookArea[]).map((a) => (
          <button key={a} aria-pressed={area === a} onClick={() => setArea(a)}>{BOOK_AREAS[a]}</button>
        ))}
        {custom.length > 0 && <button aria-pressed={area === 'mine'} onClick={() => setArea('mine')}>Мои <small>{custom.length}</small></button>}
      </div>

      <section className="card flush">
        <ul className="list books">
          {shown.map((b) => {
            const st = states[b.id] ?? 'todo';
            const isCustom = b.id.startsWith('c-');
            return (
              <li key={b.id}>
                <div className="grow">
                  <div className="title" style={{ whiteSpace: 'normal' }}>
                    {b.title}{b.en && <span className="lang">EN</span>}
                  </div>
                  <div className="meta">{b.author}{area === 'all' && ` · ${BOOK_AREAS[b.area]}`}</div>
                  {b.note && <div className="note">{b.note}</div>}
                </div>
                <button className={`chip status ${st === 'done' ? 'ok' : st === 'reading' ? 'accent' : ''}`}
                  aria-label={`${b.title}: ${label[st]}. Сменить статус`} onClick={() => setStates((p) => ({ ...p, [b.id]: next[st] }))}>
                  {st === 'done' && <IconCheck width={13} />}{label[st]}
                </button>
                {isCustom && (
                  <button className="icon-btn" aria-label={`Удалить ${b.title}`} onClick={() => confirm(`Удалить «${b.title}»?`) && setCustom((p) => p.filter((x) => x.id !== b.id))}>
                    <IconTrash width={18} />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </section>
    </>
  );
}

import { useState } from 'react';
import { APPS_TARGET, EVENING_RULES, GOALS, PAGES_TARGET, REVIEW_QUESTIONS, TOTAL_DAYS, WEEKS } from '../data/plan';
import { doneCount, isComplete, useChallenge } from '../lib/challenge';
import { formatDM, formatShort, today, type ISODate } from '../lib/date';
import { useData, useRecord } from '../lib/store';
import { IconCheck, IconChevronR } from '../components/Icons';
import type { Tab } from '../App';

export function Progress({ openDate, go, header }: { openDate: (d: ISODate) => void; go: (t: Tab) => void; header: React.ReactNode }) {
  const view = useChallenge();
  const data = useData();
  const now = today();
  const { dates, attempt, settings } = view;

  const elapsed = dates.filter((d) => d <= now);
  const full = elapsed.filter((d) => isComplete(view.logFor(d))).length;
  const currentDay = elapsed.length;
  let streak = 0;
  for (let i = elapsed.length - 1; i >= 0; i--) {
    const ok = isComplete(view.logFor(elapsed[i]));
    if (ok) streak++;
    else if (elapsed[i] !== now) break; // today may still be in progress
  }

  // Pages and weight across every logged day, not just this attempt.
  let pages = 0;
  const weights: { d: string; w: number }[] = [];
  for (const [k, rec] of Object.entries(data)) {
    if (!k.startsWith('day:')) continue;
    const v = rec.v as { pages?: number; weight?: number };
    pages += v.pages ?? 0;
    if (v.weight) weights.push({ d: k.slice(4), w: v.weight });
  }
  weights.sort((a, b) => a.d.localeCompare(b.d));
  const apps = ((data.apps?.v as unknown[]) ?? []).length;

  return (
    <div className="page">
      <header className="topbar glass">
        <h1>Прогресс<span className="sub">Попытка {settings.attempts.length} · старт {formatDM(attempt.start)}</span></h1>
        {header}
      </header>

      <div className="tiles">
        <Tile k="День" v={Math.min(currentDay, TOTAL_DAYS)} of={TOTAL_DAYS} />
        <Tile k="Полных дней" v={full} of={Math.max(currentDay, 1)} variant="ok" sub={streak > 0 ? `серия ${streak}` : undefined} />
        <Tile k="Страниц" v={pages} of={PAGES_TARGET} variant="blue" />
        <Tile k="Откликов" v={apps} of={APPS_TARGET} onClick={() => go('growth')} />
      </div>

      <div className="cols">
        <div className="stack">
          <section className="card">
            <div className="card-title"><h2>90 дней</h2><span className="tiny">Нажми на день, чтобы открыть</span></div>
            <div className="grid90">
              {Array.from({ length: TOTAL_DAYS }, (_, i) => {
                const d = dates[i];
                const n = d ? doneCount(view.logFor(d)) : 0;
                const cls = !d || d > now ? '' : n === 9 ? 'full' : n > 0 || d < now ? 'part' : '';
                return (
                  <button key={i} className={`cell ${cls}${d === now ? ' today' : ''}`} title={d ? `День ${i + 1} · ${formatShort(d)} · ${n}/9` : `День ${i + 1}`}
                    onClick={() => d && openDate(d)} aria-label={`День ${i + 1}${d ? `, ${formatShort(d)}, ${n} из 9` : ''}`}>
                    {i + 1}
                  </button>
                );
              })}
            </div>
            <div className="legend">
              <span><i style={{ background: 'var(--ok)' }} />Все 9 правил</span>
              <span><i style={{ background: 'var(--warn-soft)', boxShadow: 'inset 0 0 0 1.5px var(--warn)' }} />Не закрыт</span>
              <span><i style={{ background: 'var(--fill)', boxShadow: 'inset 0 0 0 2px var(--accent)' }} />Сегодня</span>
            </div>
          </section>

          <Reviews />
        </div>

        <div className="stack">
          <Goals />
          {weights.length > 0 && (
            <section className="card">
              <div className="card-title"><h2>Вес тела</h2><span className="chip">{weights[weights.length - 1].w} кг</span></div>
              <Spark points={weights.map((p) => p.w)} />
              <div className="row tiny" style={{ marginTop: 6 }}>
                <span>{formatDM(weights[0].d)} · {weights[0].w} кг</span><span className="spacer" />
                {weights.length > 1 && <span>{(weights[weights.length - 1].w - weights[0].w > 0 ? '+' : '') + (weights[weights.length - 1].w - weights[0].w).toFixed(1)} кг</span>}
              </div>
            </section>
          )}
          {settings.attempts.length > 1 && (
            <section className="card flush">
              <div className="card-title" style={{ padding: '16px 16px 0' }}><h2>Попытки</h2></div>
              <ul className="list">
                {[...settings.attempts].reverse().map((a, i) => (
                  <li key={a.id}>
                    <span className="num-badge">{settings.attempts.length - i}</span>
                    <div className="grow">
                      <div className="title">{formatDM(a.start)}{a.end ? ` — ${formatDM(a.end)}` : ' — сейчас'}</div>
                      {a.reason && <div className="meta">{a.reason}{a.lesson && ` → ${EVENING_RULES.find((r) => r.id === a.lesson)?.title ?? ''}`}</div>}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

function Tile({ k, v, of, variant, sub, onClick }: { k: string; v: number; of: number; variant?: 'ok' | 'blue'; sub?: string; onClick?: () => void }) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag className="card tile" onClick={onClick} style={onClick ? { textAlign: 'left' } : undefined}>
      <div className="k">{k}{sub && <span className="tiny"> · {sub}</span>}</div>
      <div className="v">{v} <small>/ {of}</small></div>
      <div className={`bar ${variant ?? ''}`}><i style={{ width: `${Math.min(100, (v / of) * 100)}%` }} /></div>
    </Tag>
  );
}

function Spark({ points }: { points: number[] }) {
  if (points.length < 2) return <div className="tiny">Нужно минимум две записи веса.</div>;
  const min = Math.min(...points), max = Math.max(...points);
  const span = max - min || 1;
  const W = 300, H = 64;
  const xy = points.map((p, i) => [(i / (points.length - 1)) * W, H - 6 - ((p - min) / span) * (H - 12)]);
  const d = xy.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  return (
    <svg className="spark" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label="График веса тела">
      <path d={`${d} L${W},${H} L0,${H} Z`} fill="var(--accent-soft)" />
      <path d={d} fill="none" stroke="var(--accent)" strokeWidth="2.5" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
    </svg>
  );
}

function Goals() {
  const [done, setDone] = useRecord<Record<string, boolean>>('goals', {});
  return (
    <section className="card flush">
      <div className="card-title" style={{ padding: '16px 16px 0' }}><h2>Цели на 90 дней</h2><span className="chip">{Object.values(done).filter(Boolean).length}/{GOALS.length}</span></div>
      <ul className="list">
        {GOALS.map((g) => (
          <li key={g.id} style={{ cursor: 'pointer' }} onClick={() => setDone((p) => ({ ...p, [g.id]: !p[g.id] }))}>
            <span className={`check${done[g.id] ? ' on' : ''}`} role="checkbox" aria-checked={!!done[g.id]} aria-label={g.text} tabIndex={0}
              onKeyDown={(e) => (e.key === ' ' || e.key === 'Enter') && (e.preventDefault(), setDone((p) => ({ ...p, [g.id]: !p[g.id] })))}>
              <IconCheck />
            </span>
            <div className="grow small" style={{ color: done[g.id] ? 'var(--text-2)' : undefined }}>{g.text}</div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Reviews() {
  const data = useData();
  const [open, setOpen] = useState<number | null>(null);
  const written = WEEKS.map((_, i) => ((data[`review:${i + 1}`]?.v as string[] | undefined) ?? []).filter((s) => s?.trim()).length);
  return (
    <section className="card flush">
      <div className="card-title" style={{ padding: '16px 16px 0' }}><h2>Еженедельные разборы</h2></div>
      <ul className="list">
        {WEEKS.map((w, i) => (
          <li key={w} style={{ flexDirection: 'column', alignItems: 'stretch', gap: 10 }}>
            <button className="row" style={{ textAlign: 'left', flexWrap: 'nowrap' }} onClick={() => setOpen(open === i ? null : i)} aria-expanded={open === i}>
              <span className="num-badge" style={written[i] ? { background: 'var(--ok-soft)', color: 'var(--ok)' } : undefined}>{i + 1}</span>
              <span className="grow"><span className="title" style={{ display: 'block' }}>{w}</span><span className="meta">{written[i] ? `${written[i]} из 6 ответов` : 'Ещё не заполнен'}</span></span>
              <IconChevronR style={{ width: 18, color: 'var(--text-3)', transform: open === i ? 'rotate(90deg)' : undefined, transition: 'transform .2s' }} />
            </button>
            {open === i && <ReviewForm week={i + 1} />}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function ReviewForm({ week }: { week: number }) {
  const [answers, setAnswers] = useRecord<string[]>(`review:${week}`, []);
  return (
    <div className="form-grid">
      {REVIEW_QUESTIONS.map((q, i) => (
        <label key={q} className="field">
          <span>{i + 1}. {q}</span>
          <textarea className="textarea" rows={2} value={answers[i] ?? ''}
            onChange={(e) => setAnswers((prev) => { const next = [...prev]; next[i] = e.target.value; return next; })} />
        </label>
      ))}
    </div>
  );
}

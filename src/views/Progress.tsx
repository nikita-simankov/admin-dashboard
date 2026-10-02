import { useState } from 'react';
import { APPS_TARGET, EVENING_RULES, GOALS, PAGES_TARGET, REVIEW_QUESTIONS, TOTAL_DAYS, WEEKS } from '../data/plan';
import { doneCount, isComplete, useChallenge } from '../lib/challenge';
import { formatDM, formatShort, today, type ISODate } from '../lib/date';
import { useData, useRecord } from '../lib/store';
import { PageHeader, toRoman } from '../components/Ornaments';
import { IconPlus } from '../components/Icons';

export function Progress({ openDate, sync }: { openDate: (d: ISODate) => void; sync: React.ReactNode }) {
  const view = useChallenge();
  const data = useData();
  const now = today();
  const { dates, attempt, settings } = view;

  const elapsed = dates.filter((d) => d <= now);
  const full = elapsed.filter((d) => isComplete(view.logFor(d))).length;
  const todayIdx = dates.indexOf(now);
  const currentWeek = todayIdx >= 0 ? Math.floor(todayIdx / 7) : -1;

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
    <div className="page wide">
      <PageHeader over={<>Попытка {toRoman(settings.attempts.length)} · с {formatDM(attempt.start)}{sync}</>} title="Летопись" />

      <div className="stats">
        <div className="stat"><b>{Math.min(elapsed.length, TOTAL_DAYS)}<small> / 90</small></b><span className="label">дней</span></div>
        <div className="stat"><b>{full}</b><span className="label">полных</span></div>
        <div className="stat"><b>{pages}<small> / {PAGES_TARGET}</small></b><span className="label">страниц</span></div>
        <div className="stat"><b>{apps}<small> / {APPS_TARGET}</small></b><span className="label">откликов</span></div>
      </div>

      <div className="cols">
        <div className="stack">
          <section>
            <h2 className="sh">Мозаика девяноста дней</h2>
            <div className="mosaic">
              {WEEKS.map((_, w) => (
                <div key={w} className={`mosaic-row${w === currentWeek ? ' current' : ''}`}>
                  <i>{toRoman(w + 1)}</i>
                  {Array.from({ length: 7 }, (_, j) => {
                    const i = w * 7 + j;
                    if (i >= TOTAL_DAYS) return <span key={j} />;
                    const d = dates[i];
                    const n = d ? doneCount(view.logFor(d)) : 0;
                    const cls = !d || d > now ? '' : n === 9 ? 'full' : d < now || n > 0 ? 'part' : '';
                    return (
                      <button key={j} className={`tile ${cls}${d === now ? ' today' : ''}`} onClick={() => d && openDate(d)}
                        title={d ? `День ${i + 1} · ${formatShort(d)} · ${n}/9` : `День ${i + 1}`}
                        aria-label={`День ${i + 1}${d ? `, ${formatShort(d)}, ${n} из 9` : ''}`} />
                    );
                  })}
                </div>
              ))}
            </div>
            <div className="legend">
              <span><i style={{ background: 'var(--gold)' }} />исполнен</span>
              <span><i style={{ background: 'var(--terra-dim)', boxShadow: 'inset 0 0 0 1px rgba(200,106,60,.5)' }} />не закрыт</span>
            </div>
          </section>
          <Goals />
        </div>

        <div className="stack">
          <Reviews currentWeek={currentWeek} />
          {weights.length > 1 && (
            <section>
              <h2 className="sh">Вес тела</h2>
              <Spark points={weights.map((p) => p.w)} />
              <div className="row tiny" style={{ marginTop: 8 }}>
                <span>{formatDM(weights[0].d)} · {weights[0].w} кг</span>
                <span className="spacer" />
                <span>{formatDM(weights[weights.length - 1].d)} · {weights[weights.length - 1].w} кг</span>
              </div>
            </section>
          )}
          {settings.attempts.length > 1 && (
            <section>
              <h2 className="sh">Попытки</h2>
              <ul className="list">
                {[...settings.attempts].reverse().map((a, i) => (
                  <li key={a.id}>
                    <span className="rule-num">{toRoman(settings.attempts.length - i)}</span>
                    <div className="grow">
                      <div className="title">{formatDM(a.start)}{a.end ? ` — ${formatDM(a.end)}` : ' — ныне'}</div>
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

function Spark({ points }: { points: number[] }) {
  const min = Math.min(...points), max = Math.max(...points);
  const span = max - min || 1;
  const W = 300, H = 70;
  const d = points
    .map((p, i) => `${i ? 'L' : 'M'}${((i / (points.length - 1)) * W).toFixed(1)},${(H - 8 - ((p - min) / span) * (H - 16)).toFixed(1)}`)
    .join(' ');
  return (
    <svg className="spark" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label="График веса тела">
      <path d={d} fill="none" stroke="var(--gold)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
    </svg>
  );
}

function Goals() {
  const [done, setDone] = useRecord<Record<string, boolean>>('goals', {});
  return (
    <section>
      <h2 className="sh">Цели на девяносто дней</h2>
      <ul className="list">
        {GOALS.map((g, i) => (
          <li key={g.id}>
            <span className="rule-num">{toRoman(i + 1)}</span>
            <div className="grow" style={{ color: done[g.id] ? 'var(--ink-3)' : undefined }}>{g.text}</div>
            <button className={`seal${done[g.id] ? ' on' : ''}`} aria-pressed={!!done[g.id]} aria-label={g.text}
              onClick={() => setDone((p) => ({ ...p, [g.id]: !p[g.id] }))}>
              <span className="diamond" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Reviews({ currentWeek }: { currentWeek: number }) {
  const data = useData();
  const [open, setOpen] = useState<number | null>(null);
  const written = WEEKS.map((_, i) => ((data[`review:${i + 1}`]?.v as string[] | undefined) ?? []).filter((s) => s?.trim()).length);
  return (
    <section>
      <h2 className="sh">Разборы недель</h2>
      <ul className="list">
        {WEEKS.map((w, i) => (
          <li key={w} className={`stack-item${i === currentWeek ? ' current' : ''}${written[i] === 6 ? ' past' : ''}`}>
            <button className="row" style={{ textAlign: 'left', flexWrap: 'nowrap', width: '100%' }} onClick={() => setOpen(open === i ? null : i)} aria-expanded={open === i}>
              <span className="rule-num">{toRoman(i + 1)}</span>
              <span className="grow">
                <span className="title" style={{ display: 'block' }}>{w}</span>
                <span className="meta">{written[i] ? `${written[i]} из 6 ответов` : 'не заполнен'}</span>
              </span>
              <IconPlus width={15} style={{ color: 'var(--ink-3)', transform: open === i ? 'rotate(45deg)' : undefined, transition: 'transform .3s', flexShrink: 0 }} />
            </button>
            {open === i && <div style={{ paddingLeft: 48 }}><ReviewForm week={i + 1} /></div>}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function ReviewForm({ week }: { week: number }) {
  const [answers, setAnswers] = useRecord<string[]>(`review:${week}`, []);
  return (
    <div className="form">
      {REVIEW_QUESTIONS.map((q, i) => (
        <label key={q} className="field">
          <span className="italic muted" style={{ fontSize: 18 }}>{toRoman(i + 1)}. {q}</span>
          <textarea rows={1} value={answers[i] ?? ''}
            onChange={(e) => setAnswers((prev) => { const next = [...prev]; next[i] = e.target.value; return next; })} />
        </label>
      ))}
    </div>
  );
}

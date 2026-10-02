import { useState } from 'react';
import {
  EVENING_RULES, FOCUS, MEALS, MOTTO, PAGES_GOAL, RELAPSE, RULES, STAGE_LABEL, STAGE_NAMES, TOTAL_DAYS,
  WATER_GOAL, WATER_MAX, WEEKS, WORKOUT_NAMES, isDeepWorkDay, isReviewDay, weekOfDay, workoutForDay, type RuleId,
} from '../data/plan';
import {
  dayKey, dayNumber, doneCount, emptyDay, isPaused, openDays, ruleDone, useChallenge, type DayLog, type Settings,
} from '../lib/challenge';
import { addDays, diffDays, formatLong, formatShort, plural, today, type ISODate } from '../lib/date';
import { getRecord, setRecord, useRecord } from '../lib/store';
import { ReviewForm } from './Progress';
import { Ring } from '../components/Ring';
import { Sheet } from '../components/Sheet';
import { startTimer } from '../components/Timer';
import {
  IconAlert, IconBook, IconCheck, IconChevronL, IconChevronR, IconDrop, IconDumbbell, IconMinus, IconPause, IconPlus,
  IconEdit, IconRefresh, IconTarget, IconTimer,
} from '../components/Icons';
import type { Tab } from '../App';

type Props = { date: ISODate; setDate: (d: ISODate) => void; go: (t: Tab) => void; header: React.ReactNode };

export function Today({ date, setDate, go, header }: Props) {
  const view = useChallenge();
  const { attempt, settings } = view;
  const now = today();
  const log = view.logFor(date);
  const update = (patch: Partial<DayLog> | ((l: DayLog) => Partial<DayLog>)) => {
    const cur = view.logFor(date);
    const p = typeof patch === 'function' ? patch(cur) : patch;
    setRecord(dayKey(date), { ...cur, ...p });
  };
  const toggle = (id: RuleId | 'clean') => update((l) => ({ done: { ...l.done, [id]: !l.done[id] } }));

  const paused = isPaused(attempt, date);
  const beforeStart = date < attempt.start;
  const dn = dayNumber(attempt, date);
  const planDay = dn ?? (beforeStart ? 1 : null);
  const isFuture = date > now;
  const editable = !!dn && dn <= TOTAL_DAYS && !isFuture;
  const done = doneCount(log);
  const prevLog = view.logFor(addDays(date, -1));
  const open = date === now ? openDays(view, now) : [];

  const [sheet, setSheet] = useState<null | 'fail' | 'pause'>(null);

  const label = date === now ? 'Сегодня' : date === addDays(now, -1) ? 'Вчера' : date === addDays(now, 1) ? 'Завтра' : formatShort(date);

  return (
    <div className="page">
      <header className="topbar glass">
        <h1>
          {label}
          <span className="sub">{formatLong(date)}</span>
        </h1>
        <button className="icon-btn" aria-label="Предыдущий день" onClick={() => setDate(addDays(date, -1))}><IconChevronL /></button>
        {date !== now && <button className="pill-btn" onClick={() => setDate(now)}>Сегодня</button>}
        <button className="icon-btn" aria-label="Следующий день" onClick={() => setDate(addDays(date, 1))}><IconChevronR /></button>
        {header}
      </header>

      {open.length > 0 && (
        <div className="banner" role="status">
          <IconAlert style={{ color: 'var(--warn)' }} />
          <div style={{ flex: 1 }}>
            <b>
              {open.length === 1
                ? `День ${open[0].day} (${formatShort(open[0].date)}) не закрыт: ${open[0].done}/9`
                : `Не закрыто ${open.length} ${plural(open.length, 'день', 'дня', 'дней')}`}
            </b>
            <span className="small muted">Если правила выполнены — отметь их. Если нет — правила говорят: перезапуск с дня 1.</span>
            <div className="inline-controls">
              <button className="pill-btn" onClick={() => setDate(open[0].date)}>Открыть день {open[0].day}</button>
              <button className="pill-btn accent" onClick={() => setSheet('fail')}>Начать заново</button>
            </div>
          </div>
        </div>
      )}

      <div className="cols">
        <div className="stack">
          <Hero date={date} dn={dn} paused={paused} beforeStart={beforeStart} start={attempt.start} done={done} onResume={() => resume(settings)} />

          {editable && (
            <section className="card flush" aria-label="Правила дня">
              <div className="card-title" style={{ padding: '16px 16px 0', marginBottom: 0 }}>
                <h2>9 правил</h2>
                <span className={`chip ${done === 9 ? 'ok' : ''}`}>{done === 9 ? 'День закрыт' : `${done} из 9`}</span>
              </div>
              <ul className="rules">
                {RULES.map((r, i) => (
                  <RuleRow key={r.id} n={i + 1} id={r.id} log={log} day={dn!} date={date} toggle={toggle} update={update} />
                ))}
              </ul>
            </section>
          )}
          {!editable && !paused && (isFuture || beforeStart) && (
            <div className="banner blue"><IconTarget style={{ color: 'var(--blue)' }} /><div><b>{beforeStart ? 'Челлендж ещё не начался' : 'Этот день ещё впереди'}</b><span className="small muted">Отметки станут доступны в сам день. {MOTTO}</span></div></div>
          )}
        </div>

        <div className="stack">
          {planDay && planDay <= TOTAL_DAYS && !paused && (
            <DayPlan day={planDay} go={go} carried={prevLog.tomorrow} />
          )}

          {editable && (
            <section className="card">
              <div className="card-title"><h2>Вечер · 21:30</h2></div>
              <div className="form-grid">
                <label className="field">
                  <span>Одна строка о прошедшем дне</span>
                  <textarea className="textarea" rows={2} value={log.note} placeholder="Что получилось, что нет…" onChange={(e) => update({ note: e.target.value })} />
                </label>
                <label className="field">
                  <span>Главная задача на завтра</span>
                  <input className="input" value={log.tomorrow} placeholder={dn! < TOTAL_DAYS ? focusFor(dn! + 1) : ''} onChange={(e) => update({ tomorrow: e.target.value })} />
                </label>
                <div className="form-grid two">
                  <label className="field">
                    <span>Вес тела, кг</span>
                    <input className="input" inputMode="decimal" value={log.weight ?? ''} placeholder="—"
                      onChange={(e) => { const v = parseFloat(e.target.value.replace(',', '.')); update({ weight: Number.isFinite(v) ? v : undefined }); }} />
                  </label>
                  <label className="field">
                    <span>Служба помешала? Причина</span>
                    <input className="input" value={log.excuse ?? ''} placeholder="Наряд, дежурство…" onChange={(e) => update({ excuse: e.target.value })} />
                  </label>
                </div>
              </div>
            </section>
          )}

          {editable && isReviewDay(dn!) && <WeeklyReview week={weekOfDay(dn!)} />}

          {date === now && dn && (
            <section className="card">
              <div className="card-title"><h2>Если что-то пошло не так</h2></div>
              <div className="row">
                <button className="btn" onClick={() => setSheet('pause')}><IconPause /> Болезнь — пауза</button>
                <button className="btn danger" onClick={() => setSheet('fail')}><IconRefresh /> Сорвался</button>
              </div>
            </section>
          )}
        </div>
      </div>

      {sheet === 'fail' && <FailSheet settings={settings} onClose={() => setSheet(null)} onDone={(d) => { setSheet(null); setDate(d); }} />}
      {sheet === 'pause' && <PauseSheet settings={settings} onClose={() => setSheet(null)} />}
    </div>
  );
}

function Hero(props: { date: ISODate; dn: number | null; paused: boolean; beforeStart: boolean; start: ISODate; done: number; onResume: () => void }) {
  const { dn, paused, beforeStart, start, done, date } = props;
  if (beforeStart) {
    const left = diffDays(date, start);
    return (
      <section className="hero glass">
        <div className="hero-info">
          <div className="eyebrow">До старта</div>
          <div className="hero-day">{left} <small>{plural(left, 'день', 'дня', 'дней')}</small></div>
          <div className="hero-meta">Старт — {formatLong(start).toLowerCase()}. Подъём 06:00, отбой 22:00.</div>
        </div>
        <Ring value={0} max={TOTAL_DAYS}><b>0</b><span>из 90</span></Ring>
      </section>
    );
  }
  if (paused) {
    return (
      <section className="hero glass">
        <div className="hero-info">
          <div className="eyebrow">Пауза · болезнь</div>
          <div className="hero-day" style={{ fontSize: 30 }}>Выздоравливай</div>
          <div className="hero-meta">Счётчик дней заморожен. Остальные правила — по возможности.</div>
          <div className="inline-controls"><button className="btn primary" onClick={props.onResume}><IconCheck /> Выздоровел — продолжить</button></div>
        </div>
      </section>
    );
  }
  if (!dn) return null;
  if (dn > TOTAL_DAYS) {
    return (
      <section className="hero glass">
        <div className="hero-info">
          <div className="eyebrow">90 HARD пройден</div>
          <div className="hero-day">90 <small>из 90</small></div>
          <div className="hero-meta">Сравни фото дня 1 и дня 90. Запиши итоги и план на следующие 90 дней.</div>
        </div>
        <Ring value={90} max={90}><b>✓</b></Ring>
      </section>
    );
  }
  const w = weekOfDay(dn);
  const { stage } = workoutForDay(dn);
  return (
    <section className="hero glass">
      <div className="hero-info">
        <div className="eyebrow">Неделя {w} · {WEEKS[w - 1]}</div>
        <div className="hero-day">День {dn} <small>/ 90</small></div>
        <div className="hero-meta">{done === 9 ? 'Все правила выполнены. Отбой в 22:00.' : `Осталось ${9 - done} ${plural(9 - done, 'правило', 'правила', 'правил')}`}</div>
        <div className="chips">
          <span className="chip accent">{STAGE_LABEL[stage]}</span>
          <span className="chip">{Math.round((dn / TOTAL_DAYS) * 100)}% пути</span>
        </div>
      </div>
      <Ring value={done} max={9} color={done === 9 ? 'var(--ok)' : undefined}>
        <b>{done}</b><span>из 9</span>
      </Ring>
    </section>
  );
}

/** Focus task for a plan day: the user's own wording if set, otherwise the plan's. */
function focusFor(day: number): string {
  return getRecord<string>(`focus:${day}`, '') || FOCUS[day - 1];
}

function FocusRow({ day, deep }: { day: number; deep: boolean }) {
  const [custom, setCustom] = useRecord<string>(`focus:${day}`, '');
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const text = (custom || FOCUS[day - 1]).replace(/^3 часа: /, '');
  const save = () => { setCustom(draft.trim() === FOCUS[day - 1] ? '' : draft.trim()); setEditing(false); };
  return (
    <div className="plan-row">
      <span className="plan-icon blue"><IconTarget /></span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span className="label">{deep ? 'Глубокая работа · 3 часа' : 'Фокус-час · 60 минут'}{custom && ' · своя задача'}</span>
        {editing ? (
          <form className="form-grid" style={{ marginTop: 6 }} onSubmit={(e) => { e.preventDefault(); save(); }}>
            <textarea className="textarea" rows={2} value={draft} autoFocus onChange={(e) => setDraft(e.target.value)} />
            <div className="row">
              <button className="pill-btn accent" type="submit">Сохранить</button>
              {custom && <button className="pill-btn" type="button" onClick={() => { setCustom(''); setEditing(false); }}>Вернуть из плана</button>}
              <button className="pill-btn" type="button" onClick={() => setEditing(false)}>Отмена</button>
            </div>
          </form>
        ) : (
          <span className="value" style={{ display: 'block' }}>{text}</span>
        )}
      </span>
      {!editing && (
        <button className="icon-btn" aria-label="Изменить задачу фокус-часа" onClick={() => { setDraft(custom || FOCUS[day - 1]); setEditing(true); }}>
          <IconEdit width={18} />
        </button>
      )}
    </div>
  );
}

function DayPlan({ day, go, carried }: { day: number; go: (t: Tab) => void; carried: string }) {
  const { type, stage } = workoutForDay(day);
  const deep = isDeepWorkDay(day);
  return (
    <section className="card">
      <div className="card-title"><h2>План дня {day}</h2></div>
      <button className="plan-row" style={{ width: '100%', textAlign: 'left' }} onClick={() => go('workout')}>
        <span className="plan-icon"><IconDumbbell /></span>
        <span style={{ flex: 1 }}>
          <span className="label">Тренировка 1</span>
          <span className="value" style={{ display: 'block' }}>{WORKOUT_NAMES[type]}{type !== 'recovery' && ` — ${STAGE_NAMES[stage]}`}</span>
        </span>
        <IconChevronR style={{ width: 20, color: 'var(--text-3)', alignSelf: 'center' }} />
      </button>
      <FocusRow day={day} deep={deep} />
      {carried && (
        <div className="plan-row">
          <span className="plan-icon ok"><IconCheck /></span>
          <span style={{ flex: 1 }}>
            <span className="label">Главная задача (записана вчера)</span>
            <span className="value" style={{ display: 'block' }}>{carried}</span>
          </span>
        </div>
      )}
    </section>
  );
}

type RowProps = {
  n: number;
  id: RuleId;
  log: DayLog;
  day: number;
  date: ISODate;
  toggle: (id: RuleId | 'clean') => void;
  update: (p: Partial<DayLog> | ((l: DayLog) => Partial<DayLog>)) => void;
};

function Check({ on, onClick, label }: { on: boolean; onClick?: () => void; label: string }) {
  if (!onClick) {
    return <span className={`check${on ? ' on' : ''}`} role="img" aria-label={`${label}: ${on ? 'выполнено' : 'не выполнено'}`}><IconCheck /></span>;
  }
  return (
    <button className={`check${on ? ' on' : ''}`} role="checkbox" aria-checked={on} aria-label={label}
      onClick={(e) => { e.stopPropagation(); onClick(); }}>
      <IconCheck />
    </button>
  );
}

function RuleRow({ n, id, log, day, date, toggle, update }: RowProps) {
  const rule = RULES.find((r) => r.id === id)!;
  const on = ruleDone(log, id);
  const deep = isDeepWorkDay(day);
  const { type, stage } = workoutForDay(day);
  const mark = (rid: RuleId) => () => {
    const cur: DayLog = { ...emptyDay(), ...getRecord<Partial<DayLog>>(dayKey(date), {}) };
    setRecord(dayKey(date), { ...cur, done: { ...cur.done, [rid]: true } });
  };

  let text = rule.text;
  let extra: React.ReactNode = null;
  let manual = true;

  switch (id) {
    case 'w1':
      text = type === 'recovery' ? 'Восстановление: мобильность 20 мин + лёгкое кардио 25 мин.' : `${WORKOUT_NAMES[type]} — ${STAGE_NAMES[stage]}. Только полные 45 минут.`;
      extra = <TimerBtn label="Тренировка 1" minutes={45} onDone={mark('w1')} />;
      break;
    case 'w2':
      extra = <TimerBtn label="Тренировка 2" minutes={45} onDone={mark('w2')} />;
      break;
    case 'focus':
      text = deep ? '3 часа глубокой работы над задачей субботы. Телефон в другой комнате.' : rule.text;
      extra = <TimerBtn label={deep ? 'Глубокая работа' : 'Фокус-час'} minutes={deep ? 180 : 60} onDone={mark('focus')} />;
      break;
    case 'food':
      manual = false;
      extra = (
        <div className="inline-controls">
          {MEALS.map((m, i) => (
            <button key={m} className={`pill-btn${log.meals[i] ? ' on' : ''}`} aria-pressed={!!log.meals[i]}
              onClick={() => update((l) => ({ meals: l.meals.map((v, j) => (j === i ? !v : v)) }))}>
              {log.meals[i] && <IconCheck />}{m}
            </button>
          ))}
          <button className={`pill-btn${log.done.clean ? ' on' : ''}`} aria-pressed={!!log.done.clean} onClick={() => toggle('clean')}>
            {log.done.clean && <IconCheck />}Чисто, без алкоголя
          </button>
        </div>
      );
      break;
    case 'water':
      manual = false;
      extra = (
        <div className="inline-controls">
          <div className="meter">
            <div className="meter-label">{(log.water / 1000).toLocaleString('ru-RU', { minimumFractionDigits: 1, maximumFractionDigits: 2 })} л из 2,5–3,5</div>
            <div className="bar blue"><i style={{ width: `${Math.min(100, (log.water / WATER_MAX) * 100)}%` }} /></div>
          </div>
          <button className="pill-btn" aria-label="Убрать 250 мл" onClick={() => update((l) => ({ water: Math.max(0, l.water - 250) }))}><IconMinus /></button>
          <button className="pill-btn accent" onClick={() => update((l) => ({ water: l.water + 250 }))}><IconDrop /> +250 мл</button>
        </div>
      );
      text = log.water >= WATER_GOAL ? 'Норма выполнена.' : rule.text;
      break;
    case 'read':
      manual = false;
      extra = (
        <div className="inline-controls">
          <div className="stepper">
            <button aria-label="Минус страница" onClick={() => update((l) => ({ pages: Math.max(0, l.pages - 1) }))}><IconMinus width={16} /></button>
            <input inputMode="numeric" aria-label="Страниц прочитано" value={log.pages}
              onChange={(e) => { const v = parseInt(e.target.value, 10); update({ pages: Number.isFinite(v) ? Math.max(0, v) : 0 }); }} />
            <button aria-label="Плюс страница" onClick={() => update((l) => ({ pages: l.pages + 1 }))}><IconPlus width={16} /></button>
          </div>
          <button className="pill-btn" onClick={() => update((l) => ({ pages: l.pages + 10 }))}><IconBook /> +10</button>
          <span className="tiny">{log.pages >= PAGES_GOAL ? 'Норма есть' : `ещё ${PAGES_GOAL - log.pages}`}</span>
        </div>
      );
      break;
  }

  return (
    <li className={`rule${on ? ' is-done' : ''}${manual ? ' tappable' : ''}`}
      onClick={manual ? (e) => { if ((e.target as HTMLElement).closest('button, input, textarea')) return; toggle(id); } : undefined}>
      <Check on={on} label={rule.title} onClick={manual ? () => toggle(id) : undefined} />
      <div className="rule-body">
        <div className="rule-title"><span className="rule-num">{String(n).padStart(2, '0')}</span>{rule.title}</div>
        <div className="rule-text">{text}</div>
        {extra}
      </div>
    </li>
  );
}

function TimerBtn({ label, minutes, onDone }: { label: string; minutes: number; onDone: () => void }) {
  return (
    <div className="inline-controls">
      <button className="pill-btn" onClick={() => startTimer(label, minutes, onDone)}>
        <IconTimer /> Таймер {minutes >= 60 ? `${minutes / 60} ч` : `${minutes} мин`}
      </button>
    </div>
  );
}

function WeeklyReview({ week }: { week: number }) {
  return (
    <section className="card">
      <div className="card-title"><h2>Разбор недели {week}</h2><span className="chip blue">Фокус-час дня</span></div>
      <p className="small muted" style={{ marginBottom: 12 }}>Письменно и честно.</p>
      <ReviewForm week={week} />
    </section>
  );
}

// ---------- attempt management ----------
function saveSettings(s: Settings) {
  setRecord('settings', s);
}

function resume(settings: Settings) {
  const now = today();
  const attempts = settings.attempts.map((a, i) => {
    if (i !== settings.attempts.length - 1) return a;
    const pauses = a.pauses
      .map((p) => (p.to ? p : p.from >= now ? null : { ...p, to: addDays(now, -1) }))
      .filter((p): p is NonNullable<typeof p> => !!p);
    return { ...a, pauses };
  });
  saveSettings({ attempts });
}

function PauseSheet({ settings, onClose }: { settings: Settings; onClose: () => void }) {
  const confirm = () => {
    const now = today();
    const attempts = settings.attempts.map((a, i) =>
      i === settings.attempts.length - 1 ? { ...a, pauses: [...a.pauses, { from: now }] } : a,
    );
    saveSettings({ attempts });
    onClose();
  };
  return (
    <Sheet onClose={onClose} label="Пауза">
      <h2>Пауза из-за болезни</h2>
      <p className="muted" style={{ marginBottom: 16 }}>
        Только при реальной болезни с температурой. Тренировки отменяются, счётчик дней замораживается до выздоровления, а не обнуляется. Остальные правила — по возможности.
      </p>
      <div className="row">
        <button className="btn primary" onClick={confirm}>Поставить на паузу</button>
        <button className="btn ghost" onClick={onClose}>Отмена</button>
      </div>
    </Sheet>
  );
}

function FailSheet({ settings, onClose, onDone }: { settings: Settings; onClose: () => void; onDone: (d: ISODate) => void }) {
  const now = today();
  const [reason, setReason] = useState('');
  const [lesson, setLesson] = useState(EVENING_RULES[0].id);
  const [when, setWhen] = useState<'today' | 'tomorrow'>(new Date().getHours() < 12 ? 'today' : 'tomorrow');
  const confirm = () => {
    const start = when === 'today' ? now : addDays(now, 1);
    const attempts = settings.attempts.map((a, i) =>
      i === settings.attempts.length - 1
        ? { ...a, end: addDays(start, -1), reason: reason.trim(), lesson, pauses: a.pauses.map((p) => (p.to ? p : { ...p, to: addDays(start, -1) })) }
        : a,
    );
    attempts.push({ id: `a${Date.now().toString(36)}`, start, pauses: [] });
    saveSettings({ attempts });
    onDone(start);
  };
  return (
    <Sheet onClose={onClose} label="Перезапуск">
      <h2>Перезапуск с дня 1</h2>
      <ul className="ref-list small" style={{ margin: '8px 0 16px' }}>
        {RELAPSE.map((r) => <li key={r}>{r}</li>)}
      </ul>
      <div className="form-grid">
        <label className="field">
          <span>Что привело к срыву — одной строкой</span>
          <input className="input" value={reason} onChange={(e) => setReason(e.target.value)} autoFocus />
        </label>
        <label className="field">
          <span>Какое правило вечера это предотвратит</span>
          <select className="select" value={lesson} onChange={(e) => setLesson(e.target.value)}>
            {EVENING_RULES.map((r) => <option key={r.id} value={r.id}>{r.title}</option>)}
          </select>
        </label>
        <div className="field">
          <span>День 1 — это</span>
          <div className="seg">
            <button aria-pressed={when === 'today'} onClick={() => setWhen('today')}>Сегодня</button>
            <button aria-pressed={when === 'tomorrow'} onClick={() => setWhen('tomorrow')}>Завтра утром</button>
          </div>
        </div>
        <div className="row" style={{ marginTop: 6 }}>
          <button className="btn primary" disabled={!reason.trim()} onClick={confirm}>Начать заново</button>
          <button className="btn ghost" onClick={onClose}>Отмена</button>
        </div>
      </div>
    </Sheet>
  );
}

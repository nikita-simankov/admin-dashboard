import { useState } from 'react';
import {
  EVENING_RULES, FOCUS, MEALS, MOTTO, PAGES_GOAL, RELAPSE, RULES, STAGE_NAMES, TOTAL_DAYS,
  WATER_GOAL, WATER_MAX, WEEKS, WORKOUT_NAMES, isDeepWorkDay, isReviewDay, weekOfDay, workoutForDay, type RuleId,
} from '../data/plan';
import {
  dayKey, dayNumber, doneCount, emptyDay, isPaused, openDays, ruleDone, useChallenge, type DayLog, type Settings,
} from '../lib/challenge';
import { addDays, diffDays, formatLong, formatShort, plural, today, type ISODate } from '../lib/date';
import { getRecord, setRecord, useRecord } from '../lib/store';
import { useMedia } from '../lib/useMedia';
import { ReviewForm } from './Progress';
import { Sheet } from '../components/Sheet';
import { startTimer } from '../components/Timer';
import { Laurel, PageHeader, romanSize, toRoman } from '../components/Ornaments';
import { IconArrowR, IconChevronL, IconChevronR, IconEdit, IconHourglass, IconMinus, IconPlus } from '../components/Icons';
import type { Tab } from '../App';

type Props = { date: ISODate; setDate: (d: ISODate) => void; go: (t: Tab) => void; sync: React.ReactNode };
type Update = (patch: Partial<DayLog> | ((l: DayLog) => Partial<DayLog>)) => void;

const litres = (ml: number) => (ml / 1000).toLocaleString('ru-RU', { minimumFractionDigits: 1, maximumFractionDigits: 2 });

export function Today({ date, setDate, go, sync }: Props) {
  const view = useChallenge();
  const wide = useMedia('(min-width: 1000px)');
  const { attempt, settings } = view;
  const now = today();
  const log = view.logFor(date);
  const update: Update = (patch) => {
    const cur = view.logFor(date);
    setRecord(dayKey(date), { ...cur, ...(typeof patch === 'function' ? patch(cur) : patch) });
  };

  const paused = isPaused(attempt, date);
  const beforeStart = date < attempt.start;
  const dn = dayNumber(attempt, date);
  const planDay = dn ?? (beforeStart ? 1 : null);
  const isFuture = date > now;
  const editable = !!dn && dn <= TOTAL_DAYS && !isFuture;
  const open = date === now ? openDays(view, now) : [];
  const [sheet, setSheet] = useState<null | 'fail' | 'pause'>(null);
  const [openRule, setOpenRule] = useState<RuleId | null>(null);

  const title = date === now ? 'Сегодня' : date === addDays(now, -1) ? 'Вчера' : date === addDays(now, 1) ? 'Завтра' : formatShort(date);

  const header = (
    <PageHeader over={<>{formatLong(date)}{sync}</>} title={title}>
      <button className="icon-btn" aria-label="Предыдущий день" onClick={() => setDate(addDays(date, -1))}><IconChevronL /></button>
      {date !== now && <button className="btn quiet small" onClick={() => setDate(now)}>Сегодня</button>}
      <button className="icon-btn" aria-label="Следующий день" onClick={() => setDate(addDays(date, 1))}><IconChevronR /></button>
    </PageHeader>
  );

  const notice = open.length > 0 && (
    <div className="notice" role="status">
      <p>
        {open.length === 1
          ? `День ${toRoman(open[0].day)} не закрыт — ${open[0].done} из 9`
          : `Не закрыто ${open.length} ${plural(open.length, 'день', 'дня', 'дней')}`}
      </p>
      <p className="tiny">Если правила исполнены — отметь их. Если нет — перезапуск с первого дня.</p>
      <div className="row">
        <button className="btn small" onClick={() => setDate(open[0].date)}>Открыть день {toRoman(open[0].day)}</button>
        <button className="btn small danger" onClick={() => setSheet('fail')}>Начать заново</button>
      </div>
    </div>
  );

  const hero = <Hero date={date} dn={dn} paused={paused} beforeStart={beforeStart} start={attempt.start} done={doneCount(log)} onResume={() => resume(settings)} />;

  const plan = planDay && planDay <= TOTAL_DAYS && !paused && (
    <section>
      <h2 className="sh">{dn ? 'План дня' : 'План первого дня'}</h2>
      <DayPlan day={planDay} go={go} carried={view.logFor(addDays(date, -1)).tomorrow} />
    </section>
  );

  const rules = editable && (
    <section aria-label="Девять правил">
      <h2 className="sh">Девять правил <small>· {doneCount(log)}/9</small></h2>
      <ul className="rules">
        {RULES.map((r, i) => (
          <RuleRow key={r.id} n={i + 1} id={r.id} log={log} day={dn!} date={date} update={update} go={go}
            open={openRule === r.id} onOpen={() => setOpenRule(openRule === r.id ? null : r.id)} />
        ))}
      </ul>
    </section>
  );

  const evening = editable && <Evening log={log} update={update} nextFocus={dn! < TOTAL_DAYS ? focusFor(dn! + 1) : ''} />;

  const review = editable && isReviewDay(dn!) && (
    <section>
      <h2 className="sh">Разбор недели {toRoman(weekOfDay(dn!))}</h2>
      <ReviewForm week={weekOfDay(dn!)} />
    </section>
  );

  const footer = date === now && dn && (
    <div className="row center">
      <button className="btn quiet small" onClick={() => setSheet('pause')}>Пауза по болезни</button>
      <span className="faint">·</span>
      <button className="btn quiet small" onClick={() => setSheet('fail')}>Начать заново</button>
    </div>
  );

  const preview = !editable && !paused && (isFuture || beforeStart) && <p className="epigraph">{MOTTO}</p>;

  return (
    <div className="page wide">
      {header}
      {wide ? (
        <div className="cols">
          <div className="stack">{hero}{plan}{evening}</div>
          <div className="stack">{notice}{rules}{preview}{review}{footer}</div>
        </div>
      ) : (
        <>{notice}{hero}{plan}{rules}{preview}{evening}{review}{footer}</>
      )}
      {sheet === 'fail' && <FailSheet settings={settings} onClose={() => setSheet(null)} onDone={(d) => { setSheet(null); setDate(d); }} />}
      {sheet === 'pause' && <PauseSheet settings={settings} onClose={() => setSheet(null)} />}
    </div>
  );
}

function Hero(props: { date: ISODate; dn: number | null; paused: boolean; beforeStart: boolean; start: ISODate; done: number; onResume: () => void }) {
  const { dn, paused, beforeStart, start, done, date } = props;
  if (beforeStart) {
    const left = diffDays(date, start);
    const r = toRoman(left);
    return (
      <section className="hero">
        <Laurel lit={0}>
          <span className={`roman ${romanSize(r)}`}>{r}</span>
          <span className="label">{plural(left, 'день', 'дня', 'дней')} до начала</span>
        </Laurel>
        <div className="hero-caption">
          <div className="overline">Начало</div>
          <span className="italic">{formatLong(start)}</span>
        </div>
      </section>
    );
  }
  if (paused) {
    return (
      <section className="hero">
        <Laurel lit={0}><span className="roman l">Пауза</span></Laurel>
        <div className="hero-caption">
          <span className="italic">Счётчик дней заморожен до выздоровления</span>
          <div className="row center" style={{ marginTop: 16 }}><button className="btn gold" onClick={props.onResume}>Выздоровел — продолжить</button></div>
        </div>
      </section>
    );
  }
  if (!dn) return null;
  if (dn > TOTAL_DAYS) {
    return (
      <section className="hero">
        <Laurel lit={9}><span className="roman">XC</span><span className="label">пройдено</span></Laurel>
        <div className="hero-caption"><span className="italic">Девяносто дней. Сравни фото первого и последнего дня.</span></div>
      </section>
    );
  }
  const w = weekOfDay(dn);
  const r = toRoman(dn);
  return (
    <section className="hero">
      <Laurel lit={done}>
        <span className={`roman ${romanSize(r)}`}>{r}</span>
        <span className="label">день {dn} из 90</span>
      </Laurel>
      <div className="hero-caption">
        <div className="overline">Неделя {toRoman(w)}</div>
        <span className="italic">{WEEKS[w - 1]}</span>
      </div>
    </section>
  );
}

/** Focus task for a plan day: the user's own wording if set, otherwise the plan's. */
function focusFor(day: number): string {
  return getRecord<string>(`focus:${day}`, '') || FOCUS[day - 1];
}

function DayPlan({ day, go, carried }: { day: number; go: (t: Tab) => void; carried: string }) {
  const { type, stage } = workoutForDay(day);
  return (
    <div className="lines">
      <button className="line-item" onClick={() => go('workout')}>
        <div>
          <span className="label">Тренировка</span>
          <span className="val">{WORKOUT_NAMES[type]}{type !== 'recovery' && ` · ${STAGE_NAMES[stage]}`}</span>
        </div>
        <IconArrowR />
      </button>
      <FocusRow day={day} />
      {carried && (
        <div className="line-item">
          <div>
            <span className="label">Записано вчера</span>
            <span className="val">{carried}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function FocusRow({ day }: { day: number }) {
  const [custom, setCustom] = useRecord<string>(`focus:${day}`, '');
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const deep = isDeepWorkDay(day);
  const save = () => { setCustom(draft.trim() === FOCUS[day - 1] ? '' : draft.trim()); setEditing(false); };
  return (
    <div className="line-item">
      <div>
        <span className="label">{deep ? 'Глубокая работа · 3 часа' : 'Фокус-час'}</span>
        {editing ? (
          <form className="form" style={{ gap: 12 }} onSubmit={(e) => { e.preventDefault(); save(); }}>
            <label className="field"><textarea value={draft} autoFocus onChange={(e) => setDraft(e.target.value)} aria-label="Задача фокус-часа" /></label>
            <div className="row">
              <button className="btn small gold" type="submit">Сохранить</button>
              {custom && <button className="btn small quiet" type="button" onClick={() => { setCustom(''); setEditing(false); }}>Вернуть из плана</button>}
              <button className="btn small quiet" type="button" onClick={() => setEditing(false)}>Отмена</button>
            </div>
          </form>
        ) : (
          <span className="val">{(custom || FOCUS[day - 1]).replace(/^3 часа: /, '')}</span>
        )}
      </div>
      {!editing && (
        <button className="icon-btn" aria-label="Изменить задачу фокус-часа" onClick={() => { setDraft(custom || FOCUS[day - 1]); setEditing(true); }}>
          <IconEdit width={18} />
        </button>
      )}
    </div>
  );
}

// ---------- rules ----------
function Seal({ on, progress, plus, label, onClick }: { on: boolean; progress?: number; plus?: boolean; label: string; onClick: () => void }) {
  const c = 2 * Math.PI * 15;
  return (
    <button className={`seal${on ? ' on' : ''}`} aria-label={label} aria-pressed={plus ? undefined : on} onClick={onClick}>
      {progress !== undefined && (
        <svg className="ring" viewBox="0 0 32 32" aria-hidden="true">
          <circle className="track" cx="16" cy="16" r="15" />
          <circle className="fill" cx="16" cy="16" r="15" strokeDasharray={c} strokeDashoffset={c * (1 - Math.min(1, progress))} />
        </svg>
      )}
      {plus ? <IconPlus className="plus" /> : <span className="diamond" style={progress !== undefined ? { width: 9, height: 9 } : undefined} />}
    </button>
  );
}

type RowProps = { n: number; id: RuleId; log: DayLog; day: number; date: ISODate; update: Update; go: (t: Tab) => void; open: boolean; onOpen: () => void };

function RuleRow({ n, id, log, day, date, update, go, open, onOpen }: RowProps) {
  const rule = RULES.find((r) => r.id === id)!;
  const on = ruleDone(log, id);
  const deep = isDeepWorkDay(day);
  const { type, stage } = workoutForDay(day);
  const toggle = (k: RuleId | 'clean') => update((l) => ({ done: { ...l.done, [k]: !l.done[k] } }));
  const mark = (rid: RuleId) => () => {
    const cur: DayLog = { ...emptyDay(), ...getRecord<Partial<DayLog>>(dayKey(date), {}) };
    setRecord(dayKey(date), { ...cur, done: { ...cur.done, [rid]: true } });
  };
  const timer = (label: string, minutes: number, rid: RuleId) => (
    <button className="btn small" onClick={() => startTimer(label, minutes, mark(rid))}>
      <IconHourglass /> {minutes >= 60 ? `${minutes / 60} ${plural(minutes / 60, 'час', 'часа', 'часов')}` : `${minutes} минут`}
    </button>
  );
  const meals = log.meals.filter(Boolean).length;

  let status = '';
  let text = rule.text;
  let seal = <Seal on={on} label={rule.title} onClick={() => toggle(id)} />;
  let detail: React.ReactNode = null;

  switch (id) {
    case 'wake':
      status = 'каждый день, включая выходные';
      break;
    case 'w1':
      status = type === 'recovery' ? 'восстановление' : `${WORKOUT_NAMES[type].toLowerCase()} · ${STAGE_NAMES[stage]}`;
      text = 'Калистеника по программе дня. Засчитывается только полные 45 минут.';
      detail = <div className="row">{timer('Тренировка I', 45, 'w1')}<button className="btn small quiet" onClick={() => go('workout')}>Программа <IconArrowR /></button></div>;
      break;
    case 'w2':
      status = 'ходьба, бег или мобильность';
      detail = <div className="row">{timer('Тренировка II', 45, 'w2')}</div>;
      break;
    case 'food':
      status = `${meals} из 4 приёмов${log.done.clean ? ' · чисто' : ''}`;
      seal = <Seal on={on} progress={(meals + (log.done.clean ? 1 : 0)) / 5} label="Питание: открыть" onClick={onOpen} />;
      detail = (
        <div className="toggles">
          {MEALS.map((m, i) => (
            <button key={m} className={`toggle${log.meals[i] ? ' on' : ''}`} aria-pressed={!!log.meals[i]}
              onClick={() => update((l) => ({ meals: l.meals.map((v, j) => (j === i ? !v : v)) }))}>
              <span className="diamond" />{m}
            </button>
          ))}
          <button className={`toggle${log.done.clean ? ' on' : ''}`} aria-pressed={!!log.done.clean} onClick={() => toggle('clean')}>
            <span className="diamond" />Чисто, без алкоголя
          </button>
        </div>
      );
      break;
    case 'water':
      status = `${litres(log.water)} из 2,5 л`;
      seal = <Seal on={on} progress={log.water / WATER_GOAL} plus label="Добавить 250 мл воды" onClick={() => update((l) => ({ water: l.water + 250 }))} />;
      detail = (
        <div className="meter">
          <div className="stepper">
            <button aria-label="Убрать 250 мл" onClick={() => update((l) => ({ water: Math.max(0, l.water - 250) }))}><IconMinus /></button>
            <input readOnly value={litres(log.water)} aria-label="Литров выпито" />
            <button aria-label="Добавить 250 мл" onClick={() => update((l) => ({ water: l.water + 250 }))}><IconPlus /></button>
          </div>
          <div className="bar lapis"><i style={{ width: `${Math.min(100, (log.water / WATER_MAX) * 100)}%` }} /></div>
        </div>
      );
      break;
    case 'read':
      status = `${log.pages} из ${PAGES_GOAL} страниц`;
      seal = <Seal on={on} progress={log.pages / PAGES_GOAL} plus label="Добавить 10 страниц" onClick={() => update((l) => ({ pages: l.pages + 10 }))} />;
      detail = (
        <div className="row">
          <div className="stepper">
            <button aria-label="Минус страница" onClick={() => update((l) => ({ pages: Math.max(0, l.pages - 1) }))}><IconMinus /></button>
            <input inputMode="numeric" aria-label="Страниц прочитано" value={log.pages}
              onChange={(e) => { const v = parseInt(e.target.value, 10); update({ pages: Number.isFinite(v) ? Math.max(0, v) : 0 }); }} />
            <button aria-label="Плюс страница" onClick={() => update((l) => ({ pages: l.pages + 1 }))}><IconPlus /></button>
          </div>
        </div>
      );
      break;
    case 'focus':
      status = deep ? 'три часа глубокой работы' : '60 минут, телефон в другой комнате';
      text = deep ? 'Суббота: три часа над задачей дня, засчитываются как фокус-час.' : rule.text;
      detail = <div className="row">{timer(deep ? 'Глубокая работа' : 'Фокус-час', deep ? 180 : 60, 'focus')}</div>;
      break;
    case 'sleep':
      status = 'телефон вне кровати с 21:30';
      break;
    case 'photo':
      status = 'фото утром, строка вечером';
      break;
  }

  return (
    <li className={`rule${on ? ' done' : ''}`}>
      <div className="rule-head">
        <span className="rule-num">{toRoman(n)}</span>
        <button className="rule-open" aria-expanded={open} onClick={onOpen}>
          <span className="rule-title">{rule.title}</span>
          <span className="rule-status">{status}</span>
        </button>
        {seal}
      </div>
      {open && (
        <div className="rule-detail">
          <p>{text}</p>
          {detail}
        </div>
      )}
    </li>
  );
}

function Evening({ log, update, nextFocus }: { log: DayLog; update: Update; nextFocus: string }) {
  const [more, setMore] = useState(false);
  const showMore = more || !!log.weight || !!log.excuse;
  return (
    <section>
      <h2 className="sh">Вечер · 21:30</h2>
      <div className="form">
        <label className="field">
          <span className="label">Строка о прошедшем дне</span>
          <textarea rows={1} value={log.note} placeholder="что получилось, что нет" onChange={(e) => update({ note: e.target.value })} />
        </label>
        <label className="field">
          <span className="label">Главная задача на завтра</span>
          <textarea rows={1} value={log.tomorrow} placeholder={nextFocus.replace(/^3 часа: /, '')} onChange={(e) => update({ tomorrow: e.target.value })} />
        </label>
        {showMore ? (
          <div className="two">
            <label className="field">
              <span className="label">Вес тела, кг</span>
              <input inputMode="decimal" value={log.weight ?? ''} placeholder="—"
                onChange={(e) => { const v = parseFloat(e.target.value.replace(',', '.')); update({ weight: Number.isFinite(v) ? v : undefined }); }} />
            </label>
            <label className="field">
              <span className="label">Служба помешала</span>
              <input value={log.excuse ?? ''} placeholder="причина" onChange={(e) => update({ excuse: e.target.value })} />
            </label>
          </div>
        ) : (
          <div><button className="btn quiet small" style={{ paddingLeft: 0 }} onClick={() => setMore(true)}>+ Вес и причины</button></div>
        )}
      </div>
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
      <div className="overline">Исключение</div>
      <h2>Пауза по болезни</h2>
      <p className="muted" style={{ marginBottom: 24 }}>
        Только при реальной болезни с температурой. Тренировки отменяются, счётчик дней замораживается до выздоровления, а не обнуляется. Остальные правила — по возможности.
      </p>
      <div className="row">
        <button className="btn gold" onClick={confirm}>Поставить на паузу</button>
        <button className="btn quiet" onClick={onClose}>Отмена</button>
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
      <div className="overline">Перезапуск</div>
      <h2>С первого дня</h2>
      <ol className="decree" style={{ margin: '14px 0 24px' }}>
        {RELAPSE.map((r, i) => <li key={r}><i>{toRoman(i + 1)}</i><span>{r}</span></li>)}
      </ol>
      <div className="form">
        <label className="field">
          <span className="label">Что привело к срыву</span>
          <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="одной строкой" autoFocus />
        </label>
        <label className="field">
          <span className="label">Какое правило вечера это предотвратит</span>
          <select value={lesson} onChange={(e) => setLesson(e.target.value)}>
            {EVENING_RULES.map((r) => <option key={r.id} value={r.id}>{r.title}</option>)}
          </select>
        </label>
        <div className="field">
          <span className="label">Первый день</span>
          <div className="tabs small">
            <button aria-pressed={when === 'today'} onClick={() => setWhen('today')}>Сегодня</button>
            <button aria-pressed={when === 'tomorrow'} onClick={() => setWhen('tomorrow')}>Завтра утром</button>
          </div>
        </div>
        <div className="row">
          <button className="btn gold" disabled={!reason.trim()} onClick={confirm}>Начать заново</button>
          <button className="btn quiet" onClick={onClose}>Отмена</button>
        </div>
      </div>
    </Sheet>
  );
}

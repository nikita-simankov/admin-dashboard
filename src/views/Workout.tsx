import { useMemo, useState } from 'react';
import {
  EXERCISES, RECOVERY, STAGE_NAMES, TOTAL_DAYS, TRAINING_NOTES, WORKOUT_HINT, WORKOUT_NAMES, workoutForDay,
  type Exercise, type Stage, type WorkoutType,
} from '../data/plan';
import { dayKey, dayNumber, emptyDay, useChallenge, type DayLog } from '../lib/challenge';
import { formatDM, formatLong, today, type ISODate } from '../lib/date';
import { setRecord, useData, useRecord } from '../lib/store';
import { startTimer } from '../components/Timer';
import { IconCheck, IconTimer } from '../components/Icons';

type SetLog = { w?: string; r?: string };
type WorkoutLog = Record<string, SetLog[]>;

const TYPES: WorkoutType[] = ['push', 'pull', 'legs', 'recovery'];

export function Workout({ date, header }: { date: ISODate; header: React.ReactNode }) {
  const view = useChallenge();
  const dn = dayNumber(view.attempt, date);
  const planned = workoutForDay(Math.min(Math.max(dn ?? 1, 1), TOTAL_DAYS));
  const [type, setType] = useState<WorkoutType>(planned.type);
  const [stage, setStage] = useState<Stage>(planned.stage);
  const [log, setLog] = useRecord<WorkoutLog>(`wo:${date}`, {});
  const data = useData();
  const dayLog: DayLog = view.logFor(date);
  const w1Done = !!dayLog.done.w1;
  const canMark = !!dn && dn <= TOTAL_DAYS && date <= today();

  // Most recent earlier log per exercise, for "last time" and progression hints.
  const history = useMemo(() => {
    const out: Record<string, { date: string; sets: SetLog[] }> = {};
    const prior = Object.keys(data).filter((k) => k.startsWith('wo:') && k.slice(3) < date).sort().reverse();
    for (const k of prior) {
      const wl = data[k].v as WorkoutLog;
      for (const [id, sets] of Object.entries(wl)) {
        if (!out[id] && sets.some((s) => s.r || s.w)) out[id] = { date: k.slice(3), sets };
      }
    }
    return out;
  }, [data, date]);

  const exercises = type === 'recovery' ? [] : EXERCISES[stage][type];
  const setSet = (ex: Exercise, i: number, patch: SetLog) =>
    setLog((prev) => {
      const sets = Array.from({ length: ex.sets }, (_, j) => prev[ex.id]?.[j] ?? {});
      sets[i] = { ...sets[i], ...patch };
      return { ...prev, [ex.id]: sets };
    });
  const markDone = () => setRecord(dayKey(date), { ...emptyDay(), ...dayLog, done: { ...dayLog.done, w1: !w1Done } });

  return (
    <div className="page narrow">
      <header className="topbar glass">
        <h1>
          Тренировка
          <span className="sub">{dn && dn <= TOTAL_DAYS ? `День ${dn} · ` : ''}{formatLong(date)}</span>
        </h1>
        <button className="pill-btn" onClick={() => startTimer('Отдых', 1.5)} aria-label="Таймер отдыха 90 секунд"><IconTimer /> 90 с</button>
        {header}
      </header>

      <div className="seg" role="group" aria-label="Тип тренировки">
        {TYPES.map((t) => (
          <button key={t} aria-pressed={type === t} onClick={() => setType(t)}>
            {WORKOUT_NAMES[t]}{t === planned.type ? ' •' : ''}
          </button>
        ))}
      </div>
      {type !== 'recovery' && (
        <div className="seg" role="group" aria-label="Этап">
          {(['home', 'gym'] as Stage[]).map((s) => (
            <button key={s} aria-pressed={stage === s} onClick={() => setStage(s)}>
              Этап {s === 'home' ? '1 · дом и турники' : '2 · спортзал'}
            </button>
          ))}
        </div>
      )}

      <section className="card flush">
        <div style={{ padding: '16px 16px 4px' }}>
          <div className="card-title" style={{ marginBottom: 2 }}>
            <h2>{WORKOUT_NAMES[type]}{type !== 'recovery' && ` · ${STAGE_NAMES[stage]}`}</h2>
            <span className="chip">{WORKOUT_HINT[type]}</span>
          </div>
          <p className="tiny">{type === 'recovery' ? 'Воскресенье, оба этапа.' : 'Отдых между подходами 60–90 секунд. Записывай веса и повторения после каждого подхода.'}</p>
        </div>

        {type === 'recovery'
          ? RECOVERY.map((r) => (
              <div className="ex" key={r.id}>
                <div className="ex-head">
                  <div className="ex-name">{r.name}</div>
                  <div className="ex-scheme">{r.duration}</div>
                </div>
                <div className="inline-controls">
                  <button className="pill-btn" onClick={() => startTimer(r.name, parseInt(r.duration, 10))}><IconTimer /> Таймер</button>
                </div>
              </div>
            ))
          : exercises.map((ex) => {
              const last = history[ex.id];
              const sets = log[ex.id] ?? [];
              const hit = !!ex.top && !!last && last.sets.length >= ex.sets && last.sets.slice(0, ex.sets).every((s) => Number(s.r) >= ex.top!);
              return (
                <div className="ex" key={ex.id}>
                  <div className="ex-head">
                    <div className="ex-name">{ex.name}</div>
                    <div className="ex-scheme">{ex.sets} × {ex.reps}</div>
                  </div>
                  {ex.note && <div className="tiny" style={{ marginTop: 2 }}>{ex.note}</div>}
                  {last && (
                    <div className="ex-last">
                      {formatDM(last.date)}: {last.sets.filter((s) => s.r || s.w).map((s) => (s.w ? `${s.w}×${s.r || '–'}` : s.r)).join(', ')}
                      {hit && <span className="chip ok" style={{ marginLeft: 6 }}>{stage === 'gym' ? 'Добавь вес' : 'Усложни вариант'}</span>}
                    </div>
                  )}
                  <div className={`sets${ex.weighted ? ' weighted' : ''}`}>
                    {Array.from({ length: ex.sets }, (_, i) => {
                      const prev = last?.sets[i];
                      return (
                        <div className="set" key={i}>
                          <label>Подход {i + 1}</label>
                          <div className="x">
                            {ex.weighted && (
                              <input inputMode="decimal" aria-label={`${ex.name}, подход ${i + 1}, вес кг`} placeholder={prev?.w || 'кг'}
                                value={sets[i]?.w ?? ''} onChange={(e) => setSet(ex, i, { w: e.target.value })} />
                            )}
                            <input inputMode="numeric" aria-label={`${ex.name}, подход ${i + 1}, ${ex.unit === 'сек' ? 'секунд' : 'повторений'}`}
                              placeholder={prev?.r || (ex.unit === 'сек' ? 'сек' : 'повт')}
                              value={sets[i]?.r ?? ''} onChange={(e) => setSet(ex, i, { r: e.target.value })} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
      </section>

      {canMark && (
        <div className="row">
          <button className={`btn block ${w1Done ? 'ok' : 'primary'}`} onClick={markDone}>
            <IconCheck /> {w1Done ? 'Тренировка 1 засчитана' : 'Засчитать тренировку 1 (45 мин)'}
          </button>
        </div>
      )}

      <section className="card">
        <div className="card-title"><h2>Принципы</h2></div>
        <ul className="ref-list small">
          {TRAINING_NOTES.map((n) => <li key={n}>{n}</li>)}
        </ul>
      </section>
    </div>
  );
}

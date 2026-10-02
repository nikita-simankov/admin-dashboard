import { useMemo, useState } from 'react';
import {
  EQUIPMENT, EXERCISES, RECOVERY, STAGE_LABEL, STAGE_NAMES, TOTAL_DAYS, TRAINING_NOTES, WORKOUT_HINT, WORKOUT_NAMES,
  workoutForDay, type Exercise, type Stage, type WorkoutType,
} from '../data/plan';
import type { AnimId } from '../data/animations';
import { dayKey, dayNumber, emptyDay, useChallenge, type DayLog } from '../lib/challenge';
import { formatDM, formatLong, today, type ISODate } from '../lib/date';
import { setRecord, useData, useRecord } from '../lib/store';
import { startTimer } from '../components/Timer';
import { Sheet } from '../components/Sheet';
import { ExerciseAnim } from '../components/ExerciseAnim';
import { IconCheck, IconTimer } from '../components/Icons';

type SetLog = { r?: string };
type WorkoutLog = Record<string, SetLog[]>;
type HowTo = { name: string; scheme: string; note?: string; anim: AnimId; cues: string[]; minutes?: number };

const TYPES: WorkoutType[] = ['push', 'pull', 'legs', 'recovery'];

export function Workout({ date, header }: { date: ISODate; header: React.ReactNode }) {
  const view = useChallenge();
  const dn = dayNumber(view.attempt, date);
  const planned = workoutForDay(Math.min(Math.max(dn ?? 1, 1), TOTAL_DAYS));
  const [type, setType] = useState<WorkoutType>(planned.type);
  const [stage, setStage] = useState<Stage>(planned.stage);
  const [howTo, setHowTo] = useState<HowTo | null>(null);
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
      for (const [id, sets] of Object.entries(data[k].v as WorkoutLog)) {
        if (!out[id] && sets.some((s) => s.r)) out[id] = { date: k.slice(3), sets };
      }
    }
    return out;
  }, [data, date]);

  const exercises = type === 'recovery' ? [] : EXERCISES[stage][type];
  const setReps = (ex: Exercise, i: number, r: string) =>
    setLog((prev) => {
      const sets = Array.from({ length: ex.sets }, (_, j) => prev[ex.id]?.[j] ?? {});
      sets[i] = { r };
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
          {(['base', 'advanced'] as Stage[]).map((s) => (
            <button key={s} aria-pressed={stage === s} onClick={() => setStage(s)}>{STAGE_LABEL[s]}</button>
          ))}
        </div>
      )}

      <section className="card flush">
        <div style={{ padding: '16px 16px 4px' }}>
          <div className="card-title" style={{ marginBottom: 2 }}>
            <h2>{WORKOUT_NAMES[type]}{type !== 'recovery' && ` · ${STAGE_NAMES[stage]}`}</h2>
            <span className="chip">{WORKOUT_HINT[type]}</span>
          </div>
          <p className="tiny">
            {type === 'recovery' ? 'Воскресенье, оба этапа.' : 'Отдых между подходами 60–90 секунд. Нажми на анимацию, чтобы посмотреть технику.'}
          </p>
        </div>

        {type === 'recovery'
          ? RECOVERY.map((r) => (
              <div className="ex" key={r.id}>
                  <button className="ex-anim" onClick={() => setHowTo({ name: r.name, scheme: r.duration, anim: r.anim, cues: r.cues, minutes: r.minutes })} aria-label={`Техника: ${r.name}`}>
                    <ExerciseAnim id={r.anim} label={r.name} />
                  </button>
                  <div className="ex-info">
                    <div className="ex-name">{r.name}</div>
                    <div className="ex-scheme">{r.duration}</div>
                    <div className="inline-controls">
                      <button className="pill-btn" onClick={() => startTimer(r.name, r.minutes)}><IconTimer /> Таймер</button>
                    </div>
                  </div>
              </div>
            ))
          : exercises.map((ex) => {
              const last = history[ex.id];
              const sets = log[ex.id] ?? [];
              const hit = !!ex.top && !!last && last.sets.length >= ex.sets && last.sets.slice(0, ex.sets).every((s) => Number(s.r) >= ex.top!);
              const unit = ex.unit === 'сек' ? 'сек' : 'повт';
              return (
                <div className="ex" key={ex.id}>
                    <button className="ex-anim" onClick={() => setHowTo({ name: ex.name, scheme: `${ex.sets} × ${ex.reps}`, note: ex.note, anim: ex.anim, cues: ex.cues })} aria-label={`Техника: ${ex.name}`}>
                      <ExerciseAnim id={ex.anim} label={ex.name} />
                    </button>
                    <div className="ex-info">
                      <div className="ex-name">{ex.name}</div>
                      <div className="ex-scheme">{ex.sets} × {ex.reps}</div>
                      {ex.note && <div className="tiny">{ex.note}</div>}
                      {last && (
                        <div className="ex-last">
                          {formatDM(last.date)}: {last.sets.filter((s) => s.r).map((s) => s.r).join(', ')}
                          {hit && <span className="chip ok" style={{ marginLeft: 6 }}>Усложни вариант</span>}
                        </div>
                      )}
                    </div>
                  <div className="sets">
                    {Array.from({ length: ex.sets }, (_, i) => (
                      <label className="set" key={i}>
                        <span>Подход {i + 1}</span>
                        <input inputMode="numeric" aria-label={`${ex.name}, подход ${i + 1}, ${unit}`}
                          placeholder={last?.sets[i]?.r || unit} value={sets[i]?.r ?? ''} onChange={(e) => setReps(ex, i, e.target.value)} />
                      </label>
                    ))}
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
        <p className="small" style={{ marginBottom: 10 }}><b>Инвентарь.</b> <span className="muted">{EQUIPMENT}</span></p>
        <ul className="ref-list small">
          {TRAINING_NOTES.map((n) => <li key={n}>{n}</li>)}
        </ul>
      </section>

      {howTo && (
        <Sheet onClose={() => setHowTo(null)} label={howTo.name}>
          <div className="howto-anim"><ExerciseAnim id={howTo.anim} label={howTo.name} /></div>
          <h2>{howTo.name}</h2>
          <div className="row" style={{ marginBottom: 12 }}>
            <span className="chip accent">{howTo.scheme}</span>
            {!howTo.minutes && <span className="chip">отдых 60–90 с</span>}
          </div>
          {howTo.note && <p className="small muted" style={{ marginBottom: 12 }}>{howTo.note}</p>}
          <ol className="ref-list numbered small">
            {howTo.cues.map((c) => <li key={c}><span>{c}</span></li>)}
          </ol>
          <div className="row" style={{ marginTop: 18 }}>
            <button className="btn" onClick={() => startTimer(howTo.minutes ? howTo.name : 'Отдых', howTo.minutes ?? 1.5)}>
              <IconTimer /> {howTo.minutes ? `Таймер ${howTo.minutes} мин` : 'Отдых 90 с'}
            </button>
            <button className="btn ghost" onClick={() => setHowTo(null)}>Закрыть</button>
          </div>
        </Sheet>
      )}
    </div>
  );
}

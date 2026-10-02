import { useMemo, useState } from 'react';
import {
  EXERCISES, RECOVERY, STAGE_LABEL, TOTAL_DAYS, WORKOUT_HINT,
  workoutForDay, type Exercise, type Stage, type WorkoutType,
} from '../data/plan';
import type { AnimId } from '../data/animations';
import { dayKey, dayNumber, emptyDay, useChallenge, type DayLog } from '../lib/challenge';
import { formatDM, formatShort, today, type ISODate } from '../lib/date';
import { setRecord, useData, useRecord } from '../lib/store';
import { startTimer } from '../components/Timer';
import { Sheet } from '../components/Sheet';
import { ExerciseAnim } from '../components/ExerciseAnim';
import { PageHeader, toRoman } from '../components/Ornaments';
import { IconHourglass } from '../components/Icons';

type SetLog = { r?: string };
type WorkoutLog = Record<string, SetLog[]>;
type HowTo = { name: string; scheme: string; note?: string; anim: AnimId; cues: string[]; minutes?: number };

const TYPES: WorkoutType[] = ['push', 'pull', 'legs', 'recovery'];
const scheme = (ex: Exercise) => `${ex.sets} × ${ex.reps}`;
const TAB_LABEL: Record<WorkoutType, string> = { push: 'Толкающие', pull: 'Тянущие', legs: 'Ноги', recovery: 'Восстановление' };
const STAGE_TAB: Record<Stage, string> = { base: 'I · база', advanced: 'II · прогрессия' };

export function Workout({ date, sync }: { date: ISODate; sync: React.ReactNode }) {
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

  // Most recent earlier log per exercise, for "last time" and the progression hint.
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
    <div className="page">
      <PageHeader over={<>{dn && dn <= TOTAL_DAYS ? `День ${toRoman(dn)} · ` : ''}{formatShort(date)}{sync}</>} title="Тренировка">
        <button className="btn quiet small" onClick={() => startTimer('Отдых', 1.5)} aria-label="Таймер отдыха 90 секунд"><IconHourglass /> 90 с</button>
      </PageHeader>

      <div>
        <div className="tabs" role="group" aria-label="Тип тренировки">
          {TYPES.map((t) => (
            <button key={t} aria-pressed={type === t} onClick={() => setType(t)}>
              {TAB_LABEL[t]}{t === planned.type && <span className="dot" aria-label="по плану" />}
            </button>
          ))}
        </div>
        <div className="row" style={{ marginTop: 14, justifyContent: 'space-between' }}>
          <span className="italic faint" style={{ fontSize: 17 }}>{WORKOUT_HINT[type]}</span>
          {type !== 'recovery' && (
            <div className="tabs small" role="group" aria-label="Этап">
              {(['base', 'advanced'] as Stage[]).map((s) => (
                <button key={s} aria-pressed={stage === s} onClick={() => setStage(s)} aria-label={STAGE_LABEL[s]}>{STAGE_TAB[s]}</button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="ex-list">
        {type === 'recovery'
          ? RECOVERY.map((r) => (
              <div className="ex" key={r.id}>
                <button className="ex-fig" onClick={() => setHowTo({ name: r.name, scheme: r.duration, anim: r.anim, cues: r.cues, minutes: r.minutes })} aria-label={`Техника: ${r.name}`}>
                  <ExerciseAnim id={r.anim} label={r.name} />
                </button>
                <div className="ex-body">
                  <div className="ex-name">{r.name}</div>
                  <div className="ex-scheme">{r.duration}</div>
                  <div style={{ marginTop: 8 }}>
                    <button className="btn small" onClick={() => startTimer(r.name, r.minutes)}><IconHourglass /> Таймер</button>
                  </div>
                </div>
              </div>
            ))
          : exercises.map((ex) => {
              const last = history[ex.id];
              const sets = log[ex.id] ?? [];
              const hit = !!ex.top && !!last && last.sets.length >= ex.sets && last.sets.slice(0, ex.sets).every((s) => Number(s.r) >= ex.top!);
              const unit = ex.unit === 'сек' ? 'секунд' : 'повторений';
              return (
                <div className="ex" key={ex.id}>
                  <button className="ex-fig" onClick={() => setHowTo({ name: ex.name, scheme: scheme(ex), note: ex.note, anim: ex.anim, cues: ex.cues })} aria-label={`Техника: ${ex.name}`}>
                    <ExerciseAnim id={ex.anim} label={ex.name} />
                  </button>
                  <div className="ex-body">
                    <div className="ex-scheme">{scheme(ex)}</div>
                    <div className="ex-name">{ex.name}</div>
                    {last && (
                      <div className="ex-last">
                        {formatDM(last.date)}: {last.sets.filter((s) => s.r).map((s) => s.r).join(' · ')}
                        {hit && <b> — усложни вариант</b>}
                      </div>
                    )}
                  </div>
                  <div className="sets">
                    {Array.from({ length: ex.sets }, (_, i) => (
                      <label className="set" key={i}>
                        <span>{toRoman(i + 1)}</span>
                        <input inputMode="numeric" aria-label={`${ex.name}, подход ${i + 1}, ${unit}`}
                          placeholder={last?.sets[i]?.r || '—'} value={sets[i]?.r ?? ''} onChange={(e) => setReps(ex, i, e.target.value)} />
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
      </div>

      {canMark && (
        <button className={`btn block ${w1Done ? '' : 'gold'}`} onClick={markDone}>
          {w1Done ? 'Тренировка засчитана' : 'Засчитать тренировку'}
        </button>
      )}

      {howTo && (
        <Sheet onClose={() => setHowTo(null)} label={howTo.name}>
          <div className="howto-fig"><ExerciseAnim id={howTo.anim} label={howTo.name} /></div>
          <div className="overline">{howTo.scheme}</div>
          <h2>{howTo.name}</h2>
          {howTo.note && <p className="italic muted" style={{ fontSize: 18, marginBottom: 6 }}>{howTo.note}</p>}
          <ol className="decree" style={{ margin: '14px 0 26px' }}>
            {howTo.cues.map((c, i) => <li key={c}><i>{toRoman(i + 1)}</i><span>{c}</span></li>)}
          </ol>
          <div className="row">
            <button className="btn" onClick={() => startTimer(howTo.minutes ? howTo.name : 'Отдых', howTo.minutes ?? 1.5)}>
              <IconHourglass /> {howTo.minutes ? `${howTo.minutes} минут` : 'Отдых 90 с'}
            </button>
            <button className="btn quiet" onClick={() => setHowTo(null)}>Закрыть</button>
          </div>
        </Sheet>
      )}
    </div>
  );
}

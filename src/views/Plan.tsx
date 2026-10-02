import { useRef, useState } from 'react';
import {
  CLARIFICATIONS, EVENING_RULES, MEAL_EXAMPLES, MOTTO, NUTRITION_RULES, RELAPSE, RULES, SCHEDULE, WHY,
} from '../data/plan';
import { useChallenge, type Settings } from '../lib/challenge';
import { weekday, today } from '../lib/date';
import { exportAll, importAll, logout, setRecord, useMeta } from '../lib/store';
import { IconChevronR } from '../components/Icons';

type Sched = keyof typeof SCHEDULE;

export function Plan({ header }: { header: React.ReactNode }) {
  const wd = weekday(today());
  const [sched, setSched] = useState<Sched>(wd === 6 ? 'saturday' : wd === 0 ? 'sunday' : 'weekday');
  return (
    <div className="page narrow">
      <header className="topbar glass">
        <h1>План<span className="sub">Подъём 06:00 · Отбой 22:00</span></h1>
        {header}
      </header>

      <section className="card"><p className="quote">{MOTTO}</p></section>

      <Acc title="Правила" open>
        <p className="small muted" style={{ marginBottom: 12 }}>Каждый день, без исключений. Пропуск любого правила — челлендж начинается заново с дня 1 на следующее утро.</p>
        <ol className="ref-list numbered">
          {RULES.map((r) => <li key={r.id}><span><b>{r.title}.</b> <span className="muted">{r.text}</span></span></li>)}
        </ol>
      </Acc>

      <Acc title="Распорядок дня">
        <div className="seg" style={{ marginBottom: 12 }}>
          {([['weekday', 'Будни'], ['saturday', 'Суббота'], ['sunday', 'Воскресенье']] as [Sched, string][]).map(([k, l]) => (
            <button key={k} aria-pressed={sched === k} onClick={() => setSched(k)}>{l}</button>
          ))}
        </div>
        <table className="table">
          <tbody>
            {SCHEDULE[sched].map((r) => <tr key={r.time + r.what}><th>{r.time}</th><td>{r.what}</td></tr>)}
          </tbody>
        </table>
      </Acc>

      <Acc title="Правила вечера">
        <p className="small muted" style={{ marginBottom: 12 }}>Вечер — главное поле боя. Именно там теряется время и откладываются важные дела.</p>
        <ul className="ref-list">
          {EVENING_RULES.map((r) => <li key={r.id}><span><b>{r.title}.</b> <span className="muted">{r.text}</span></span></li>)}
        </ul>
      </Acc>

      <Acc title="Уточнения и исключения">
        <p className="small muted" style={{ marginBottom: 12 }}>Решения приняты заранее, чтобы не искать оправданий вечером.</p>
        <ul className="ref-list small">{CLARIFICATIONS.map((c) => <li key={c}>{c}</li>)}</ul>
      </Acc>

      <Acc title="Питание">
        <ul className="ref-list small" style={{ marginBottom: 14 }}>{NUTRITION_RULES.map((c) => <li key={c}>{c}</li>)}</ul>
        <table className="table"><tbody>{MEAL_EXAMPLES.map((m) => <tr key={m.meal}><th>{m.meal}</th><td>{m.examples}</td></tr>)}</tbody></table>
      </Acc>

      <Acc title="Зачем я это делаю">
        <table className="table"><tbody>{WHY.map((w) => <tr key={w.problem}><th>{w.problem}</th><td>{w.fix}</td></tr>)}</tbody></table>
      </Acc>

      <Acc title="Если сорвался">
        <ul className="ref-list">{RELAPSE.map((c) => <li key={c}>{c}</li>)}</ul>
      </Acc>

      <SettingsCard />
    </div>
  );
}

function Acc({ title, open, children }: { title: string; open?: boolean; children: React.ReactNode }) {
  return (
    <details className="card flush acc" open={open}>
      <summary>{title}<IconChevronR className="chev" width={18} /></summary>
      <div className="acc-body">{children}</div>
    </details>
  );
}

function SettingsCard() {
  const { settings, attempt } = useChallenge();
  const meta = useMeta();
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState('');

  const setStart = (start: string) => {
    if (!start) return;
    const attempts = settings.attempts.map((a, i) => (i === settings.attempts.length - 1 ? { ...a, start } : a));
    setRecord<Settings>('settings', { attempts });
  };
  const download = () => {
    const blob = new Blob([exportAll()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `90hard-${today()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const upload = async (file?: File) => {
    if (!file || !confirm('Заменить все данные содержимым файла?')) return;
    try {
      importAll(await file.text());
      setMsg('Данные восстановлены');
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Ошибка импорта');
    }
  };

  return (
    <section className="card">
      <div className="card-title"><h2>Настройки</h2></div>
      <div className="form-grid">
        <label className="field">
          <span>Дата старта текущей попытки</span>
          <input className="input" type="date" value={attempt.start} onChange={(e) => setStart(e.target.value)} />
        </label>
        <div className="row">
          <button className="btn" onClick={download}>Экспорт JSON</button>
          <button className="btn" onClick={() => fileRef.current?.click()}>Импорт</button>
          <input ref={fileRef} type="file" accept="application/json" hidden onChange={(e) => upload(e.target.files?.[0])} />
          {meta.auth === 'ok' && <button className="btn ghost" onClick={logout}>Выйти</button>}
        </div>
        {msg && <p className="small muted">{msg}</p>}
        <p className="tiny">
          {meta.auth === 'ok' ? 'Данные синхронизируются с сервером и доступны на всех устройствах.' : 'Сервер недоступен — данные сохраняются на этом устройстве и синхронизируются при подключении.'}
        </p>
      </div>
    </section>
  );
}

import { useRef, useState } from 'react';
import {
  CLARIFICATIONS, EQUIPMENT, EVENING_RULES, MEAL_EXAMPLES, MOTTO, NUTRITION_RULES, RELAPSE, RULES, SCHEDULE,
  TRAINING_NOTES, WHY,
} from '../data/plan';
import { useChallenge, type Settings } from '../lib/challenge';
import { weekday, today } from '../lib/date';
import { exportAll, importAll, logout, setRecord, useMeta } from '../lib/store';
import { PageHeader, toRoman } from '../components/Ornaments';
import { IconPlus } from '../components/Icons';

type Sched = keyof typeof SCHEDULE;

function Decree({ items }: { items: (string | { title: string; text: string })[] }) {
  return (
    <ol className="decree">
      {items.map((it, i) => (
        <li key={typeof it === 'string' ? it : it.title}>
          <i>{toRoman(i + 1)}</i>
          {typeof it === 'string' ? <span>{it}</span> : <span><b style={{ color: 'var(--ink)' }}>{it.title}.</b> {it.text}</span>}
        </li>
      ))}
    </ol>
  );
}

function Chapter({ n, title, open, children }: { n: number; title: string; open?: boolean; children: React.ReactNode }) {
  return (
    <details className="chapter" open={open}>
      <summary><span className="rule-num">{toRoman(n)}</span><b>{title}</b><IconPlus className="plus" /></summary>
      <div className="chapter-body">{children}</div>
    </details>
  );
}

export function Plan({ sync }: { sync: React.ReactNode }) {
  const wd = weekday(today());
  const [sched, setSched] = useState<Sched>(wd === 6 ? 'saturday' : wd === 0 ? 'sunday' : 'weekday');
  return (
    <div className="page">
      <PageHeader over={<>Подъём 06:00 · Отбой 22:00{sync}</>} title="Кодекс" />
      <p className="epigraph">«{MOTTO}»</p>

      <div>
        <Chapter n={1} title="Девять правил" open>
          <p className="lead">Каждый день, без исключений. Пропуск любого правила — челлендж начинается заново с первого дня на следующее утро.</p>
          <Decree items={RULES} />
        </Chapter>
        <Chapter n={2} title="Распорядок дня">
          <div className="tabs small">
            {([['weekday', 'Будни'], ['saturday', 'Суббота'], ['sunday', 'Воскресенье']] as [Sched, string][]).map(([k, l]) => (
              <button key={k} aria-pressed={sched === k} onClick={() => setSched(k)}>{l}</button>
            ))}
          </div>
          <table className="table"><tbody>
            {SCHEDULE[sched].map((r) => <tr key={r.time + r.what}><th>{r.time}</th><td>{r.what}</td></tr>)}
          </tbody></table>
        </Chapter>
        <Chapter n={3} title="Правила вечера">
          <p className="lead">Вечер — главное поле боя. Именно там теряется время и откладываются важные дела.</p>
          <Decree items={EVENING_RULES} />
        </Chapter>
        <Chapter n={4} title="Уточнения и исключения">
          <p className="lead">Решения приняты заранее, чтобы не искать оправданий вечером.</p>
          <Decree items={CLARIFICATIONS} />
        </Chapter>
        <Chapter n={5} title="Тренировки">
          <p className="lead">{EQUIPMENT}</p>
          <Decree items={TRAINING_NOTES} />
        </Chapter>
        <Chapter n={6} title="Питание">
          <Decree items={NUTRITION_RULES} />
          <table className="table"><tbody>
            {MEAL_EXAMPLES.map((m) => <tr key={m.meal}><th>{m.meal}</th><td>{m.examples}</td></tr>)}
          </tbody></table>
        </Chapter>
        <Chapter n={7} title="Зачем я это делаю">
          <table className="table"><tbody>
            {WHY.map((w) => <tr key={w.problem}><th>{w.problem}</th><td>{w.fix}</td></tr>)}
          </tbody></table>
        </Chapter>
        <Chapter n={8} title="Если сорвался">
          <Decree items={RELAPSE} />
        </Chapter>
        <Chapter n={9} title="Настройки">
          <SettingsPanel />
        </Chapter>
      </div>
    </div>
  );
}

function SettingsPanel() {
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
    <div className="form">
      <label className="field">
        <span className="label">Начало текущей попытки</span>
        <input type="date" value={attempt.start} onChange={(e) => setStart(e.target.value)} />
      </label>
      <div className="row">
        <button className="btn small" onClick={download}>Экспорт</button>
        <button className="btn small" onClick={() => fileRef.current?.click()}>Импорт</button>
        <input ref={fileRef} type="file" accept="application/json" hidden onChange={(e) => upload(e.target.files?.[0])} />
        {meta.auth === 'ok' && <button className="btn small quiet" onClick={logout}>Выйти</button>}
      </div>
      {msg && <p className="italic muted">{msg}</p>}
      <p className="tiny">
        {meta.auth === 'ok' ? 'Записи хранятся на сервере и доступны на всех устройствах.' : 'Сервер недоступен — записи сохраняются на этом устройстве и отправятся при подключении.'}
      </p>
    </div>
  );
}

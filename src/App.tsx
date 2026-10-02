import { useEffect, useState } from 'react';
import { initSession, login, useMeta } from './lib/store';
import { today, type ISODate } from './lib/date';
import { Today } from './views/Today';
import { Workout } from './views/Workout';
import { Progress } from './views/Progress';
import { Growth } from './views/Growth';
import { Plan } from './views/Plan';
import { TimerPill } from './components/Timer';
import { IconBook, IconBriefcase, IconChart, IconDumbbell, IconToday } from './components/Icons';

export type Tab = 'today' | 'workout' | 'progress' | 'growth' | 'plan';

const TABS: { id: Tab; label: string; Icon: typeof IconToday }[] = [
  { id: 'today', label: 'Сегодня', Icon: IconToday },
  { id: 'workout', label: 'Тренировка', Icon: IconDumbbell },
  { id: 'progress', label: 'Прогресс', Icon: IconChart },
  { id: 'growth', label: 'Развитие', Icon: IconBriefcase },
  { id: 'plan', label: 'План', Icon: IconBook },
];

const readHash = (): Tab => {
  const h = location.hash.replace(/^#\/?/, '') as Tab;
  return TABS.some((t) => t.id === h) ? h : 'today';
};

export function App() {
  const meta = useMeta();
  const [tab, setTab] = useState<Tab>(readHash);
  const [date, setDate] = useState<ISODate>(today);

  useEffect(() => {
    initSession();
    const onHash = () => setTab(readHash());
    window.addEventListener('hashchange', onHash);
    // Roll "today" over at midnight if the app stays open.
    let last = today();
    const id = setInterval(() => {
      const t = today();
      if (t !== last) {
        setDate((d) => (d === last ? t : d));
        last = t;
      }
    }, 60_000);
    return () => {
      window.removeEventListener('hashchange', onHash);
      clearInterval(id);
    };
  }, []);

  const go = (t: Tab) => {
    if (t !== tab) location.hash = `/${t}`;
    window.scrollTo({ top: 0 });
  };
  const openDate = (d: ISODate) => {
    setDate(d);
    go('today');
  };

  if (meta.auth === 'required') return <Login />;

  const sync = (
    <span className={`sync-dot ${meta.auth === 'local' ? 'local' : meta.status}`} role="status"
      title={meta.auth === 'local' ? 'Только на этом устройстве' : meta.status === 'idle' ? 'Синхронизировано' : meta.status === 'syncing' ? 'Синхронизация…' : 'Нет связи с сервером'}
      style={{ margin: '0 12px 0 4px' }} />
  );

  return (
    <div className="app">
      <div className="backdrop" />
      <nav className="sidebar glass" aria-label="Разделы">
        <div className="brand"><span className="brand-mark">90</span>90 HARD</div>
        {TABS.map(({ id, label, Icon }) => (
          <button key={id} className="side-link" aria-current={tab === id ? 'page' : undefined} onClick={() => go(id)}>
            <Icon /> {label}
          </button>
        ))}
        <div className="side-foot">Дисциплина — это выполнять план тогда, когда не хочется.</div>
      </nav>

      <main className="main">
        {tab === 'today' && <Today date={date} setDate={setDate} go={go} header={sync} />}
        {tab === 'workout' && <Workout key={date} date={date} header={sync} />}
        {tab === 'progress' && <Progress openDate={openDate} go={go} header={sync} />}
        {tab === 'growth' && <Growth header={sync} />}
        {tab === 'plan' && <Plan header={sync} />}
      </main>

      <nav className="tabbar glass" aria-label="Разделы">
        {TABS.map(({ id, label, Icon }) => (
          <button key={id} className="tab" aria-current={tab === id ? 'page' : undefined} onClick={() => go(id)}>
            <Icon /> {label}
          </button>
        ))}
      </nav>
      <TimerPill />
    </div>
  );
}

function Login() {
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr((await login(pw)) ?? '');
    setBusy(false);
  };
  return (
    <div className="login">
      <div className="backdrop" />
      <form className="login-card glass" onSubmit={submit}>
        <div className="login-mark">90</div>
        <div>
          <h1 style={{ font: '800 26px/1.1 var(--font-display)', letterSpacing: '-0.03em' }}>90 HARD</h1>
          <p className="muted small" style={{ marginTop: 6 }}>Введи пароль, чтобы продолжить</p>
        </div>
        <input className="input" type="password" autoComplete="current-password" placeholder="Пароль" value={pw} onChange={(e) => setPw(e.target.value)} autoFocus />
        {err && <p className="err">{err}</p>}
        <button className="btn primary block" disabled={busy || !pw}>Войти</button>
      </form>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { initSession, login, useMeta } from './lib/store';
import { today, type ISODate } from './lib/date';
import { MOTTO } from './data/plan';
import { Today } from './views/Today';
import { Workout } from './views/Workout';
import { Progress } from './views/Progress';
import { Growth } from './views/Growth';
import { Plan } from './views/Plan';
import { TimerPill } from './components/Timer';
import { Laurel } from './components/Ornaments';
import { IconBook, IconColumn, IconScroll, IconSun, IconTorch } from './components/Icons';

export type Tab = 'today' | 'workout' | 'progress' | 'growth' | 'plan';

const TABS: { id: Tab; label: string; numeral: string; Icon: typeof IconSun }[] = [
  { id: 'today', label: 'День', numeral: 'I', Icon: IconSun },
  { id: 'workout', label: 'Тренировка', numeral: 'II', Icon: IconTorch },
  { id: 'progress', label: 'Летопись', numeral: 'III', Icon: IconScroll },
  { id: 'growth', label: 'Путь', numeral: 'IV', Icon: IconBook },
  { id: 'plan', label: 'Кодекс', numeral: 'V', Icon: IconColumn },
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

  // Sync state is shown only when something is wrong.
  const sync =
    meta.auth === 'local' || meta.status === 'offline' ? <span className="sync" role="status">офлайн</span>
    : meta.status === 'error' ? <span className="sync" role="status">нет связи</span>
    : null;

  return (
    <div className="app">
      <div className="backdrop" />
      <nav className="sidebar" aria-label="Разделы">
        <div className="brand">
          <Laurel lit={9}><span className="roman">XC</span></Laurel>
          <div className="brand-name">90 HARD</div>
          <div className="brand-sub">ἀρετή</div>
        </div>
        {TABS.map(({ id, label, numeral }) => (
          <button key={id} className="side-item" aria-current={tab === id ? 'page' : undefined} onClick={() => go(id)}>
            <i>{numeral}</i><span>{label}</span>
          </button>
        ))}
        <div className="side-foot">
          <div className="meander" />
          <p>{MOTTO}</p>
        </div>
      </nav>

      <main className="main">
        {tab === 'today' && <Today date={date} setDate={setDate} go={go} sync={sync} />}
        {tab === 'workout' && <Workout key={date} date={date} sync={sync} />}
        {tab === 'progress' && <Progress openDate={openDate} sync={sync} />}
        {tab === 'growth' && <Growth sync={sync} />}
        {tab === 'plan' && <Plan sync={sync} />}
      </main>

      <nav className="nav-bottom" aria-label="Разделы">
        {TABS.map(({ id, label, Icon }) => (
          <button key={id} className="nav-item" aria-current={tab === id ? 'page' : undefined} onClick={() => go(id)}>
            <Icon /><span>{label}</span>
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
      <form onSubmit={submit}>
        <Laurel lit={9}><span className="roman">XC</span></Laurel>
        <div>
          <h1>90 HARD</h1>
          <p className="epigraph" style={{ marginTop: 12 }}>{MOTTO}</p>
        </div>
        <label className="field">
          <input type="password" autoComplete="current-password" placeholder="пароль" value={pw} onChange={(e) => setPw(e.target.value)} autoFocus aria-label="Пароль" />
        </label>
        {err && <p className="err">{err}</p>}
        <button className="btn gold block" disabled={busy || !pw}>Войти</button>
      </form>
    </div>
  );
}

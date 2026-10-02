# 90 HARD

Personal tracker for the 90 HARD challenge (Oct 5, 2026 – Jan 2, 2027). It's a mobile-first PWA that also has a desktop layout, and it syncs between devices.

- **Today**: the 9 daily rules (water and pages counters, 4 meals), timers for the workouts and focus hour, the day's plan (workout + focus-hour task), the evening entry and the task for tomorrow. On Sundays it also shows the weekly review.
- **Workout**: the session for the plan day (stage 1 home / stage 2 gym), logging of weights and reps, the previous session's results, a "add weight / make it harder" hint, and a 90-second rest timer.
- **Progress**: a 90-day grid, stats (complete days, pages /900, applications /50), the 90-day goals, a body-weight chart, the weekly reviews and the history of attempts.
- **Career**: the 13-week track, the applications table with statuses, and the reading list.
- **Plan**: the rules, daily routine, evening rules, clarifications, nutrition, and settings (start date, JSON export/import).
- **Restart and pause**: "I slipped" starts a new attempt from day 1 and records the reason. "Sick — pause" freezes the day counter without resetting it.

## Stack

- Front end: React 19 + TypeScript + Vite, with no UI libraries. JS is about 90 KB gzip.
- Server: `server/index.js` on plain Node.js with **zero runtime dependencies**. It serves the build (precompressed with brotli/gzip) and the `/api` endpoint.
- Data: one JSON file. Every record carries a timestamp, and the client merges per key, so the phone and the desktop converge on the same data. The app also works offline (localStorage plus a service worker) and syncs when it's back online.

## Local development

```bash
npm install
npm run dev:server   # API on :3000 (APP_PASSWORD=... optional)
npm run dev          # Vite on :5173, proxies /api to :3000
```

Production run: `npm run build && npm start`.

## Deploying to Railway

1. New Project → Deploy from GitHub repo → pick this repository. Railway uses `railway.json` (Railpack, `npm run build`, `npm start`, healthcheck `/healthz`).
2. **Variables**:
   - `APP_PASSWORD`: the login password. Without it, the app is open to anyone who has the URL.
   - `SESSION_SECRET` (optional): any long string, used to sign the session cookie.
3. **Volume**: Service → Settings → Volumes → Add Volume, mount path `/data`. The server picks up `RAILWAY_VOLUME_MOUNT_PATH` automatically. **Without a volume, data is lost on every redeploy.**
4. Settings → Networking → Generate Domain.
5. On iPhone: open the URL in Safari → Share → "Add to Home Screen".

| Variable | Purpose | Default |
| --- | --- | --- |
| `PORT` | Port (set by Railway) | `3000` |
| `APP_PASSWORD` | Login password | not set → no login |
| `SESSION_SECRET` | Cookie signing secret | derived from the password |
| `DATA_DIR` | Data folder | `RAILWAY_VOLUME_MOUNT_PATH` or `./data` |

Backup: Plan → Settings → "Экспорт JSON".

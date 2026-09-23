# Frontend v3 — rebuild notes

This frontend now matches the v3 backend (parallel task tracker) instead
of the old AI-roadmap engine. Read this before deploying.

## 1. Connecting to the backend

Nothing changes about *how* it connects — same `.env.example` shape:

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_API_BASE_URL=https://your-railway-app.up.railway.app
```

Make sure the Railway backend's `ALLOWED_ORIGINS` includes your Vercel
origin exactly (scheme + host, no trailing slash), or the browser will
report a CORS/`Failed to fetch` error.

## 2. What each screen does now

- **Today** (`/`) — the day's required-vs-logged time as a green box,
  a sticky bar for the one session that can be running, and every
  ongoing task as a card with Start/Pause/Resume/Stop. "+ Add task"
  opens the form: name, subject, start/end date, daily hours+minutes,
  and an optional Frequency section (Weekly weekday exclusions /
  Monthly day-of-month exclusions / Manual calendar-picked dates).
- **Profile** (`/profile`) — total hours of progression across every
  task ever logged, plus Ongoing / Upcoming / Completed lists. Each
  card there has a public/private toggle and delete.

## 3. Backend contract this frontend expects

```
GET    /api/v1/tasks
POST   /api/v1/tasks
PATCH  /api/v1/tasks/{id}
DELETE /api/v1/tasks/{id}
POST   /api/v1/tasks/{id}/sessions/start
GET    /api/v1/tasks/sessions/active
POST   /api/v1/tasks/sessions/{id}/pause
POST   /api/v1/tasks/sessions/{id}/resume
POST   /api/v1/tasks/sessions/{id}/complete
GET    /api/v1/daily
GET    /api/v1/profile
```

`GET /api/v1/tasks/sessions/active` is a small addition made to the
backend zip alongside this frontend - the earlier backend zip didn't
expose a way to ask "is a timer already running?" on page load/refresh,
which this frontend genuinely needs (only one timer can run at a time).
If you already deployed the backend from the previous message, re-deploy
it with the updated zip before deploying this frontend, or `GET
/api/v1/tasks/sessions/active` will 404.

## 4. Known gap

The profile heatmap/streak view from the old build is **not** in this
rebuild - it needs a day-by-day history endpoint the v3 backend doesn't
have (the current backend only answers "what does *one* date need").
Total hours and per-status lists are there; a calendar heatmap would be
a follow-up backend + frontend addition if you want it.

## 5. Manual QA checklist (no automated test run was possible here - see below)

- [ ] Sign in / sign up / Google auth still works
- [ ] Add a task with no frequency - shows up as "Ongoing" if start date is today
- [ ] Add a task with a future start date - shows under Profile → Upcoming, not on Today
- [ ] Start a timer on one task, confirm the other task's Start button disables with "Finish the running timer first"
- [ ] Pause → Resume → Stop a session, confirm the day's green box updates
- [ ] Add a Weekly-frequency task excluding today's weekday - confirm it's excluded from today's required total
- [ ] Toggle a task public/private from Profile
- [ ] Delete a task

## 6. Verification limits of this handoff

Same caveat as the backend: this was built in a sandbox with no network,
so `npm install` / `tsc` / a real build could not be run here. Every
file was checked with `esbuild` (catches syntax and JSX errors — none
found) and manually reviewed against `tsconfig.json`'s `strict` /
`noUnusedLocals` / `noUnusedParameters` settings, but a real `npm run
build` has not been executed. **Run `npm install && npm run build`
yourself** before deploying.

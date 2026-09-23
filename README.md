# RealPathFlow — Frontend (v3)

Vite + React + TypeScript + Tailwind + Framer Motion. Talks to Supabase
directly for auth, and to the RealPathFlow backend for everything else.

This is v3 of the frontend, rebuilt to match the v3 backend: a simple
parallel-task tracker instead of the old AI-roadmap/execution engine.

## Local setup

```bash
npm install
cp .env.example .env.local   # fill in your Supabase URL/anon key + API base URL
npm run dev
```

## What's here

- `src/pages/LoginPage.tsx` — sign in / sign up (email+password and Google), unchanged from v2
- `src/pages/DashboardPage.tsx` ("Today") — today's required-vs-logged progress box, a sticky timer bar while a
  session is running, and cards for every ongoing task with Start/Pause/Resume/Stop
- `src/pages/ProfilePage.tsx` — total hours of progression, and Ongoing/Upcoming/Completed task lists with a
  public/private toggle and delete
- `src/components/AddTaskModal.tsx` — the "add task" form: name, subject, start/end date, daily time, and an
  optional frequency picker (Weekly weekday exclusions, Monthly day-of-month exclusions, or Manual calendar-picked
  active dates)
- `src/components/TaskCard.tsx` — one task's status, dates, daily target, logged total, frequency summary, and
  timer controls
- `src/components/SessionBar.tsx` — sticky top bar for the one timer that can be running at a time
- `src/components/DayProgressBox.tsx`, `LiquidVessel.tsx`, `NavBar.tsx`, `LoadingState.tsx`,
  `ProtectedRoute`/`PublicOnlyRoute` — carried over from v2 unchanged
- `src/lib/tasksApi.ts` — CRUD for tasks + start/pause/resume/complete/active-session calls
- `src/lib/profileApi.ts` — `/api/v1/daily` and `/api/v1/profile`
- `src/lib/time.ts` — duration/date formatting shared by the components above
- `src/lib/supabase.ts`, `useAuth.ts`, `api.ts` — unchanged auth/session plumbing
- `src/lib/notifications.ts` + `public/service-worker.js` — unchanged: shows a notification while a session is
  running, with working Pause/Resume from the notification itself

## Removed from v2

`CreateRoadmapPage`, `RoadmapEditPage`, `TaskBox`, `ActiveTaskBar`, `Heatmap`, `DeleteRoadmapModal`, and
`lib/aiApi.ts` / `dashboardApi.ts` / `historyApi.ts` / `preferencesApi.ts` / `roadmapApi.ts` / `heatmap.ts` — all
of these talked to backend endpoints that no longer exist. The profile heatmap in particular needs a
day-by-day history endpoint the v3 backend doesn't have yet; it can come back later as a `GET
/api/v1/daily-history` addition if it's wanted.

## Deploying

Connect this repo to Vercel. Set the three variables from `.env.example` as Vercel project environment
variables (Settings → Environment Variables), framework preset: Vite. Make sure the backend's
`ALLOWED_ORIGINS` includes the deployed Vercel origin exactly.

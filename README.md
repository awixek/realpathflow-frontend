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
  session is running, and cards for every ongoing task with Start/Pause/Resume
- `src/pages/ProfilePage.tsx` — total hours of progression, Ongoing/Upcoming/Completed task lists, and a
  clickable activity heatmap with per-day task/time/note details
- `src/components/AddTaskModal.tsx` — the "add task" form: name, subject, start/end date, daily time, and an
  optional frequency picker (Weekly weekday exclusions, Monthly day-of-month exclusions, or Manual calendar-picked
  active dates)
- `src/components/TaskCard.tsx` — task status, daily target, logged total, daily-note editor, timer controls, and
  an expandable cumulative task-progress/history panel
- `src/components/TaskDailyNoteEditor.tsx` — one private note for the task on each IST calendar date
- `src/components/TaskProgressPanel.tsx` — scheduled days, worked days, targets met, cumulative percentage, and
  recent daily time/note history
- `src/components/ProfileHistoryHeatmap.tsx` — selectable activity dates, including per-task notes and targets
- `src/components/SessionBar.tsx` — sticky top bar for the one timer that can be running at a time
- `src/components/DayProgressBox.tsx`, `LiquidVessel.tsx`, `NavBar.tsx`, `LoadingState.tsx`,
  `ProtectedRoute`/`PublicOnlyRoute` — carried over from v2 unchanged
- `src/lib/tasksApi.ts` — CRUD for tasks and timer-session API calls; the interface intentionally exposes Pause/Resume rather than a manual Stop action
- `src/lib/profileApi.ts` — `/api/v1/daily` and `/api/v1/profile`
- `src/lib/taskProgressApi.ts` — daily-note persistence, task progress history, and selected-date Profile details
- `src/lib/time.ts` — duration/date formatting shared by the components above
- `src/lib/supabase.ts`, `useAuth.ts`, `api.ts` — unchanged auth/session plumbing
- `src/lib/notifications.ts` + `public/service-worker.js` — unchanged: shows a notification while a session is
  running, with working Pause/Resume from the notification itself

## Removed from v2

`CreateRoadmapPage`, `RoadmapEditPage`, `TaskBox`, `ActiveTaskBar`, `DeleteRoadmapModal`, and
`lib/aiApi.ts` / `dashboardApi.ts` / `historyApi.ts` / `preferencesApi.ts` / `roadmapApi.ts` / `heatmap.ts` — these
belonged to the previous AI-roadmap engine. The current Profile heatmap uses the v3 profile-history endpoints.

## Deploying

Connect this repo to Vercel. Set the three variables from `.env.example` as Vercel project environment
variables (Settings → Environment Variables), framework preset: Vite. Make sure the backend's
`ALLOWED_ORIGINS` includes the deployed Vercel origin exactly.

### Daily timer completion flow

See `TASK_12_TIMER_COMPLETION_AND_NEXT_TASK.md` for the daily-target auto-stop, once-per-minute notification refresh, completion melody attempt, and next-task notification actions.

### Daily notes and progress history

See `TASK_13_DAILY_NOTES_AND_TASK_PROGRESS.md`. Before deploying note persistence, run the backend SQL migration `docs/db/24_task_daily_notes.sql` once in Supabase (after the existing v3, session-segment and timer-switching migrations).

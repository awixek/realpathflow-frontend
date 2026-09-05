# RealPathFlow — Frontend

Vite + React + TypeScript + Tailwind + Framer Motion. Talks to Supabase directly for auth, and to the [RealPathFlow backend](https://realpathflow-production.up.railway.app) for everything else.

## Local setup

```bash
npm install
cp .env.example .env.local   # fill in your Supabase URL/anon key
npm run dev
```

## What's built so far

- `src/pages/LoginPage.tsx` — sign in / sign up (email+password and Google), animated liquid-vessel hero
- `src/pages/DashboardPage.tsx` — the roadmap screen: parallel task boxes with one fill-line per task, a black-bordered liquid box for the day's overall %, and a sticky top bar with Start/Pause + live % while a task is active
- `src/pages/ProfilePage.tsx` — GitHub-style streak heatmap, liquid fill per day instead of color density
- `src/components/` — `TaskBox`, `ActiveTaskBar`, `DayProgressBox`, `Heatmap`, `NavBar`, `LiquidVessel`, plus `ProtectedRoute`/`PublicOnlyRoute` route guards
- `src/lib/mockData.ts` — placeholder roadmap/task/history data (see TODOs — swap for real backend calls once those endpoints exist)
- `src/lib/sound.ts` — the subtask-complete chime, generated with the Web Audio API (no audio file needed)
- `src/lib/supabase.ts` — Supabase client (auth only)
- `src/lib/api.ts` — fetch wrapper that attaches the Supabase session token when calling the backend
- `src/lib/useAuth.ts` — session hook used for routing and to show the signed-in user's email

## Still using mock data

Nothing anymore — both `DashboardPage` and `ProfilePage` call the real Railway backend (`src/lib/dashboardApi.ts`, `src/lib/historyApi.ts`). The one thing to know: the profile heatmap needs a `GET /api/v1/history/days` endpoint and a `created_at` column on the roadmap response, both added on the backend alongside this change — make sure the backend you're pointing at includes those (P16 checkpoint in its `docs/PROJECT_STATUS.md`).

## Deploying

Connect this repo to Vercel. Set the same three variables from `.env.example` as Vercel project environment variables (Settings → Environment Variables), framework preset: Vite.

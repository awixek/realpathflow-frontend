# Task 12 — Daily target completion and next-task notification flow

## Behaviour

- Active timer notifications refresh once per minute; server reconciliation remains on the existing 15-second cadence.
- Near the daily target, the active page probes the server at up to five-second intervals using the daily progress snapshot.
- The backend remains authoritative. When a target is detected, it closes the current running segment at the calculated target timestamp, so a delayed poll does not add polling-delay seconds to the task's daily history.
- The task card shows `Daily goal complete` and hides Start/Pause/Resume once that task has reached today's target.
- A single completion event triggers the in-app celebration and a short ascending melody attempt, then a completion notification. If another task active today still has time remaining, the notification includes a `Start <task>` action and a `Progress` action.
- While a task is active, the notification exposes Pause and Progress; while paused, Resume and Progress. The Stop action is not offered.
- Clicking Start on the completion notification opens the dashboard and starts the selected eligible task, preserving the same server-backed timer lifecycle.
- Progress notifications include the daily-target percentage, time logged today, target, and current session elapsed time.
- The daily snapshot uses the `Asia/Kolkata` day boundary, and async refresh results are guarded against stale-session updates.

## Database

No new schema migration is required for these code changes. The existing session-segment migration must already be deployed, because exact target timestamps depend on the segment ledger.

## Validation performed

- Backend Python compilation passed.
- Backend tests: `61 passed` (one existing FastAPI deprecation warning).
- Service-worker JavaScript syntax check passed.
- TypeScript syntax transpilation passed for all 38 `.ts`/`.tsx` files.
- The modified timer modules (`ActiveSessionContext`, `notifications`, `sound`, and `TaskCard`) type-checked with temporary ambient declarations. A full Vite production build could not be run in this environment because npm dependencies could not be installed from the configured registry/cache.

## Browser limitation

A web page can be suspended by Android/Chrome while the phone is locked or the browser is force-closed. The server records the exact target boundary when its next timer request checks the session, but the browser cannot guarantee an audible melody at that exact second while its page is suspended. A reliable closed-app completion push also requires an active Web Push subscription and a scheduled server-side worker; a local active-task notification alone does not keep JavaScript running in the background.

# Task 11 — Pause-only controls, task switching, and daily progress

Frontend changes:
- Removed the manual Stop/complete action from task cards, the global timer bar, and the service-worker notification.
- A second task can be started while one is running; the previous session is paused automatically.
- Starting a task with an existing paused session resumes that session rather than creating a fresh session.
- The dashboard shows the task's logged time for the current IST calendar day, percent of its daily goal, and a progress bar.
- Daily totals refresh when the date rolls over in Asia/Kolkata.

Backend changes:
- The timer service pauses the running task before switching to another task.
- The session ledger now permits multiple PAUSED sessions while enforcing at most one ACTIVE timer per user.
- Daily-target auto-stop uses the current IST date's session segments, avoiding yesterday's accumulated time being counted toward today's target.

## Deployment

1. Apply `docs/db/23_allow_multiple_paused_sessions.sql` to the existing Supabase database. This is a non-destructive index change; it keeps timer rows and history.
2. Deploy the updated backend.
3. Deploy the updated frontend. The service worker will update the timer notification to show Pause/Resume only.

The existing cross-midnight segment migration (`docs/db/19_cross_midnight_session_segments.sql`) must already have been applied, because it records exact elapsed intervals for IST history.

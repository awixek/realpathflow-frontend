# Task 13 — Daily notes and task progress

- Added a date-keyed daily note editor to Today task cards.
- Added an expandable task progress/history panel on task cards.
- Profile activity heatmap cells with scheduled activity can be clicked to view
  per-task daily time, target completion and saved notes.
- API calls and response types live in `src/lib/taskProgressApi.ts`.
- Apply the backend migration `docs/db/24_task_daily_notes.sql` before using
  note-saving and historical details in a deployed environment.

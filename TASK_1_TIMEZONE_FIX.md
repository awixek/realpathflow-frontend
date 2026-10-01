# Task 1 — IST timezone fix

Calendar-day semantics now use `Asia/Kolkata` (IST) instead of UTC.

Changed:
- Daily endpoint default date uses IST.
- Task list/create/get/update derived status uses IST.
- Profile ongoing/upcoming/completed status uses IST.
- New timer sessions store `session_date` using IST.
- Frontend `todayIso()` uses IST.
- Added backend boundary tests around UTC/IST midnight.

Verification:
- Backend pytest: 28 passed.
- Frontend build could not be completed in this environment because npm dependency installation timed out and the resulting install reported missing `@types/*` definitions. No TypeScript source error was reported from the timezone change itself.

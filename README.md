# LifeOS

A private, local-first personal life planner built with **Expo SDK 55, React Native, Expo Router, TypeScript, SQLite and Zustand**. All seven life areas share a single Life Engine. No account or cloud connection is required.

## Run it

Requirements: Node.js 22 LTS and npm. From PowerShell:

```powershell
cd D:\lifeos
npm.cmd ci
npm.cmd run web
```

Or use the production web preview:

```powershell
npm.cmd run build:web
npm.cmd run preview
```

Open **http://localhost:8081**. Keep this terminal running. The preview serves the isolation headers required by SQLite's web worker. Do not open `dist/index.html` using `file://`. Each browser/origin has its own database; the browser database and phone database are separate.

### Android

The built [Android preview APK](output/lifeos-preview.apk) is available locally (about 38 MB, arm64). Transfer it to your phone to install. It uses a development signing key, so Android will ask you to allow installing from that source. See the [QA report](docs/QA.md) for verification and remaining device checks, and [native build notes](docs/NATIVE.md) for how to add the five home-screen widgets.

```powershell
npm.cmd start
```

Open in an **Expo Go version supporting SDK 55**, or build the native app. Custom home-screen widgets require a native build, not Expo Go.

For a standalone arm64 Android preview APK, install JDK 17 and Android SDK 36, then:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\build-android.ps1
```

The script generates the Android project, builds a release-mode APK using the template's **development signing key**, and copies it to `output/lifeos-preview.apk`. This is a personal test build, not a Play Store release. No deployment or cloud build is required. See [native build notes](docs/NATIVE.md) for prerequisites, widget installation and verification limits.

## First use

A new install already carries the verified semester: period times, the college slot grid, the
eight registered courses with their slots, rooms and faculty, and an empty five-unit syllabus
skeleton per subject. Nothing else is invented — no sample tasks, habits, projects or meals.

1. Open **Me → Settings** and set your wake/sleep times, commute, meals, buffer and planning
   intensity. Confirm the Day Order rotation anchor there too.
2. Add the Academic Planner's holidays and exam dates under **Academic → Academic calendar**.
   None were assumed; the rotation skips whatever you mark as non-working.
3. Build out **Academic → Syllabus**: units are already there, add the topics you care about.
4. Capture assignments, tests, todos, announcements, habits or project ideas using **+** or the
   Academic quick actions.
5. Select **Plan my day** on Today. Calendar also supports planning a selected future day.
6. Open a task to focus, log actual minutes, partially complete it, finish it or find another time.

**Me → Your data** exports/restores JSON backups, restores the semester setup on demand, and has
a two-step action to erase records and start fresh. Erasing preserves your preferences.

## Implemented

- Five primary navigation destinations: Today, Calendar, Capture, Life and Me.
- Day/week/month calendar; fixed events and fixed exams; editable Day Orders 1–5.
- One master task system with deadlines, priorities, recurrence, linked modules and task search.
- Interval-based free-time calculation, overlap merging, buffers and wake/sleep boundaries.
- Deadline/importance/dependency-aware ranking, split sessions and relaxed/balanced/focused planning.
- Current-task and free-window recommendations; explicit rescheduling; missed-session history.
- Plans recalculate after relevant data changes. Work reserved on another day is not allocated twice.
- Durable focus timers, planned versus actual logs, completion and partial progress.
- Skills with topics, notes, resources, question counts and linked practice tasks.
- Projects and idea vault, stages, milestones, notes and linked tasks.
- Habits with four tracking types, dated logs, streaks, consistency and 28-day history.
- Workout plans, exercises, sets/reps/weights/rest, workout logs and body measurements.
- Food logs supporting arbitrary foods and portions, macro targets, water and food history.
- Weekly focus analytics, completion counts, habit consistency and weekly review.
- Contextual local notifications: morning Day Order, a lead-time nudge before each class, the
  deadline digest and exam reminders — each individually switchable.
- Five Android home-screen widgets fed by one persisted snapshot through a native Expo bridge.
- Optional Supabase email-code authentication and normalized backup transport/schema, isolated from local operation.

### Academic

A student operating system rather than a digital timetable. Full model in
[docs/ACADEMIC.md](docs/ACADEMIC.md).

- Slot architecture: course → course slot → college Day Order grid → period → resolved class.
  The grid holds every college slot; only registered slots become classes, so an unregistered
  slot is a genuine free period rather than someone else's lecture.
- Academic calendar with nine day types, per-date Day Orders, event titles and manual overrides.
  The rotation advances across working days only, so a holiday never consumes a Day Order.
- Per-date class changes: cancelled, room changed, time changed, faculty changed, extra and
  replacement classes — all of which feed straight back into free time.
- Academic dashboard: Day Order, next class, today's classes, deadline radar, study suggestions,
  a rule-based "needs attention" panel and progress at a glance.
- Assignments that track work and submission separately, so "finished but not submitted" is
  visible rather than silently counted as done.
- Assessments for eleven exam types, with countdowns, linked syllabus topics, preparation
  percentage and one-tap revision planning into real scheduled sessions.
- Syllabus tracker down to subtopics, with six topic states and class coverage, personal study
  and revision tracked as three separate figures.
- Importance flags, weak-topic flags, PYQ counts and spaced-revision dates on every topic.
- Attendance by hour with OD and cancellation handling, plus an exact threshold forecast.
- Announcements that can carry an action — Day Order change, deadline move, class cancellation,
  exam syllabus update — applied only on explicit confirmation.
- "What should I study?" ranking deadlines, exam proximity, syllabus gaps, flagged topics and
  time since revision, always with the reason it chose that.
- Marks with configurable weightage, materials, an academic inbox and academic-wide search.

## Database and architecture

`lifeos.db` is opened by `src/data/database.ts`. Versioned migrations create normalized tables with foreign keys and transactional writes. The full schema is in [docs/sqlite-schema.sql](docs/sqlite-schema.sql); its source of truth is `src/data/migrations.ts`.

UI → Zustand application store → LifeEngine → pure domain services / Repository → SQLite.

The store serializes mutations, loads the resulting rows, refreshes derived schedules when appropriate, and updates the widget snapshot. Screens do not contain scheduling algorithms. See [architecture](docs/ARCHITECTURE.md).

### Day Order rules

Weekdays rotate from the configured anchor. Whether a date advances the rotation is decided by
its `working` flag, not its label — which is what lets a special working Saturday take a Day
Order while a weekday college event does not. Holidays, exam days and non-working exceptions
pause the rotation rather than consuming an order. A manual override applies even on a weekend
and the rotation continues forward from it. Monday DO1 → Tuesday DO2 → Wednesday holiday →
Thursday DO3 is covered by a regression test, as are all five resolved Day Orders.

### Scheduling rules

The engine subtracts the resolved classes, commute either side of the campus day, meals, events
and scheduled work from the waking window. Overlapping intervals are merged. Gaps between
classes are real free time: the **free periods** setting decides whether they are protected, or
offered for study only, light tasks, or anything. A day with no classes has no college block at
all. The engine reserves only 60%, 75% or 90% of flexible capacity, applies buffers, ranks
feasible tasks and splits long tasks into sessions. Workout tasks prefer the configured evening
time. Past missed blocks are retained as history and stop reserving future work. Current focus
sessions are protected.

Use **Calendar → Plan this day** to spread work over more days. The app does not silently build an entire semester plan. An indivisible task that cannot fit remains unscheduled.

## Verify

```powershell
npm.cmd run check
npm.cmd run build:web
npm.cmd run build:android:bundle
```

Tests use Node's real SQLite engine for migrations, transactions, backup restore and close/reopen persistence; pure-engine tests cover the scheduling scenarios. Browser QA exercises the Expo SQLite WASM implementation. See [QA report](docs/QA.md) for observed checks and remaining device tests.

## Known limits and next steps

- This is a functional MVP. Advanced exam-topic-driven study allocation, resource libraries, per-set workout history, goal management and detailed calorie adherence reports are future extensions.
- Dependency data is modeled and respected by the engine; a dependency editing interface is not included.
- Overnight waking windows are not supported: sleep must be later than wake within a local calendar day. Date-only deadlines mean the end of that day.
- Short final task remainders can be shorter than the minimum session setting; long tasks avoid creating tiny tails where two valid sessions fit.
- Native notifications and widgets require phone-level acceptance testing. Widgets consume the most recent app snapshot and display its timestamp; they do not run scheduling in the background.
- Five Android widgets are implemented (Today's classes, Next class, Deadlines, Study next, Day Order). iOS WidgetKit extensions are not.
- The Academic Planner screenshots never reached the build session, so **no holidays are seeded** and the rotation anchor comes from a single worked example. Confirm both against the official planner. Unverified grid cells are flagged CHECK in the timetable editor.
- Importing a timetable from an image, PDF or CSV is designed for but not built; entry is manual.
- Supabase code is ready for explicit backups, not background conflict-resolving multi-device sync. No live cloud project was configured or tested. Store auth tokens in SecureStore before exposing cloud login in the app.
- Web requires its local server to open/reload. Native SQLite is the offline phone implementation. Browser storage can be cleared by browser settings; export backups before uninstalling either version.
- Data is local but the database is not application-level encrypted. Exported backups contain your personal records.

Add future modules by defining their normalized data and migrations, exposing module-specific forms, and creating linked tasks through `LifeEngine.save`. Extend domain functions with regression tests rather than duplicating calendar logic in screens.

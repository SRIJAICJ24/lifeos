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

The built [Android preview APK](output/lifeos-preview.apk) is available locally (about 38 MB, arm64). Transfer it to your phone to install. It uses a development signing key. See the [QA report](docs/QA.md) for verification and remaining device checks.

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

1. Explore the labelled demo, or open **Me → Settings → Edit schedule & preferences**.
2. Set your wake/sleep times, college hours, commute, meals, buffer and planning intensity.
3. Set the academic rotation anchor date and its Day Order. Configure classes once under **Life → Academic → Timetable**.
4. Use **Academic dates** for holidays, exam days, special timetables and manual overrides.
5. Capture tasks, assignments, exams, events, habits or project ideas using **+**.
6. Select **Plan my day** on Today. Calendar also supports planning a selected future day.
7. Open a task to focus, log actual minutes, partially complete it, finish it or find another time.

Demo subjects, skills, projects, habits and workouts are editable. **Me → Your data** exports/restores JSON backups and has a two-step action to erase records and start fresh. Erasing records removes both demo and personal entries; it preserves preferences.

## Implemented

- Five primary navigation destinations: Today, Calendar, Capture, Life and Me.
- Day/week/month calendar; fixed events and fixed exams; editable Day Orders 1–5.
- One master task system with deadlines, priorities, recurrence, linked modules and task search.
- Interval-based free-time calculation, overlap merging, buffers and wake/sleep boundaries.
- Deadline/importance/dependency-aware ranking, split sessions and relaxed/balanced/focused planning.
- Current-task and free-window recommendations; explicit rescheduling; missed-session history.
- Plans recalculate after relevant data changes. Work reserved on another day is not allocated twice.
- Durable focus timers, planned versus actual logs, completion and partial progress.
- Academic subjects, attendance, syllabus topics, marks and linked work.
- Skills with topics, notes, resources, question counts and linked practice tasks.
- Projects and idea vault, stages, milestones, notes and linked tasks.
- Habits with four tracking types, dated logs, streaks, consistency and 28-day history.
- Workout plans, exercises, sets/reps/weights/rest, workout logs and body measurements.
- Food logs supporting arbitrary foods and portions, macro targets, water and food history.
- Weekly focus analytics, completion counts, habit consistency and weekly review.
- Native contextual deadline digest with permission handling and at most one digest per day.
- Persisted widget snapshots and a real Android AppWidget provider with a native Expo bridge.
- Optional Supabase email-code authentication and normalized backup transport/schema, isolated from local operation.

## Database and architecture

`lifeos.db` is opened by `src/data/database.ts`. Versioned migrations create normalized tables with foreign keys and transactional writes. The full schema is in [docs/sqlite-schema.sql](docs/sqlite-schema.sql); its source of truth is `src/data/migrations.ts`.

UI → Zustand application store → LifeEngine → pure domain services / Repository → SQLite.

The store serializes mutations, loads the resulting rows, refreshes derived schedules when appropriate, and updates the widget snapshot. Screens do not contain scheduling algorithms. See [architecture](docs/ARCHITECTURE.md).

### Day Order rules

Weekdays rotate from the configured anchor. Non-academic weekdays are configurable. Holidays, exam days and non-academic exceptions do not advance the rotation. A manual academic override applies even on a weekend and restarts subsequent forward rotation from the specified order. Special timetable dates select one of the five configured timetables. Monday DO1 → Tuesday DO2 → Wednesday holiday → Thursday DO3 is covered by a regression test.

### Scheduling rules

The engine subtracts college/commute, classes, meals, events and scheduled work from the waking window. Overlapping intervals are merged. It reserves only 60%, 75% or 90% of flexible capacity, applies buffers, ranks feasible tasks and splits long tasks into sessions. Workout tasks prefer the configured evening time. Past missed blocks are retained as history and stop reserving future work. Current focus sessions are protected.

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
- One combined Android Today widget is implemented. Separate widget variants and iOS WidgetKit extensions are not implemented.
- Supabase code is ready for explicit backups, not background conflict-resolving multi-device sync. No live cloud project was configured or tested. Store auth tokens in SecureStore before exposing cloud login in the app.
- Web requires its local server to open/reload. Native SQLite is the offline phone implementation. Browser storage can be cleared by browser settings; export backups before uninstalling either version.
- Data is local but the database is not application-level encrypted. Exported backups contain your personal records.

Add future modules by defining their normalized data and migrations, exposing module-specific forms, and creating linked tasks through `LifeEngine.save`. Extend domain functions with regression tests rather than duplicating calendar logic in screens.

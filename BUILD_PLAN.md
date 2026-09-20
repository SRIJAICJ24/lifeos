# LifeOS build plan

Build a local-first Expo / React Native / TypeScript app, with Expo Router, Zustand and relational SQLite. No login required. All areas feed one tested Life Engine.

1. Foundation: strict TypeScript, database migrations, repositories, editable demo data.
2. Engine: explicit academic dates and holiday-safe day-order rotation, interval subtraction, deterministic priorities, capacity-limited split scheduling, recurrence and rescheduling.
3. Experience: Today, Calendar, Capture, Life and Me; task editing, focus sessions, onboarding and settings.
4. Areas: subjects and timetables, skills/topics, projects/milestones, habits/logs, workout/exercise logs, diet/meals.
5. Integration: analytics, contextual local notifications, persisted widget snapshots and native Android widget bridge, optional Supabase backup architecture.
6. Verification: scenario tests, SQLite persistence, strict typecheck, production bundles, browser interaction and responsive screenshots. Document native checks that require a device/toolchain.

Decisions: use local calendar dates and minute intervals; persist normalized rows rather than a JSON app-state blob; derive UI from database revision changes; preserve breathing room in daily plans; demo data is explicitly labelled and removable. Web is a development companion using the same SQLite database API. No deployment is needed.

## Delivery status

The MVP foundation, shared engine, navigation and seven life areas are implemented. Strict
TypeScript and 61 tests pass; production web export and the standalone Android APK build
succeeded.

The **Academic module** is built out as a student operating system on top of those engines: a
slot-based timetable resolver (course → course slot → college Day Order grid → period → class),
a working-day-aware academic calendar, assignments that separate work from submission,
assessments with linked syllabus topics and revision planning, a syllabus tracker that keeps
class coverage and personal study apart, hour-level attendance with forecasting, actionable
announcements, a study recommender that explains itself, marks, materials, an inbox and search.
Five Android home-screen widgets and four configurable notification types complete it.

Everything outside Academic ships empty, as a fresh install: no sample tasks, habits, projects,
workouts or meals. Only the verified semester setup is seeded.

See `docs/ACADEMIC.md` for the verified model and `docs/QA.md` for evidence and the device
acceptance steps that still require a phone.

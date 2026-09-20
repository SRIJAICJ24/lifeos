# LifeOS verification

Academic module built and verified 20 September 2026. Earlier MVP evidence is retained below.

## Passed

- Strict TypeScript and all 61 automated tests (`npm run check`). Evidence: `output/tests.log`.
- Real SQLite migrations, seed idempotence, transactions, foreign keys, backup rollback,
  close/reopen persistence and deletion behaviour.
- **Version 1 → version 2 upgrade** on a populated database: existing subjects, tasks and
  calendar rows survive; the removed subject columns and the denormalised `classes` table are
  dropped; each old day type maps to the correct `working` flag. This matters because the
  previously shipped APK carries a version 1 database.
- Holiday-safe Day Orders, overrides, free-time overlap merging, priorities, dependencies,
  planning intensity, splitting, recurrence, partial progress, missed history, cross-date
  reservations, active focus and month boundaries.
- Production web export and a browser run against Expo SQLite WASM.

### Academic module

Covered by `tests/academic.test.ts` (22 cases) and confirmed by hand in the browser.

- All five Day Orders resolve to exactly the registered classes, with consecutive periods of the
  same subject merged (the Computer Networks lab appears as one 08:00–09:40 block).
- A college slot the student is not registered for — `E`, `P36`–`P45`, `L41`/`L42` — resolves to
  a free period. Asserted per Day Order and again across the whole grid.
- A holiday shows no timetable and does not consume a Day Order; the next working day takes it.
- A manual override changes that day's classes immediately.
- An assignment becomes a master task with the right area, subject, deadline and duration;
  partial work feeds progress back; finishing the work sets *Ready to submit*, not *Submitted*.
- Editing a due date moves the deadline on the assignment, its task and the radar at once, with
  no duplicate task created.
- Overdue assignments surface in the radar, the risk panel and study suggestions.
- Exam preparation tracks linked topics; planning revision creates real scheduled study tasks,
  and planning again creates nothing further.
- Syllabus progress reports class coverage, personal study and revision as three separate
  figures; revising a topic advances its count, date and next-revision date.
- Gaps between classes become usable free time, and the *Off* free-period setting protects them.
- A cancelled class returns its time to the free-time engine.
- Attendance counts hours rather than classes; cancelled hours are recorded but never counted as
  held. Forecast arithmetic checked exactly at the threshold, in both directions.
- Day Order, timetable and attendance survive closing and reopening a real database file.
- Re-running the semester setup repairs it without duplicating anything.
- The widget snapshot carries the live Day Order, today's classes with rooms, the next class and
  the nearest deadlines.
- An announcement changes nothing until it is applied, then applies exactly its stated action.
- A subject todo can become a scheduled task and be detached again.
- Study suggestions state their reason and never propose work longer than the window available.
- Generated plans never overlap a class, and re-planning never reserves more than the work left.

### Browser checks, 20 September 2026

- All fourteen academic sections render with no console errors.
- Day Order 1 and Day Order 4 explorers show the expected classes, the expected free periods,
  and the CHECK marker on unverified grid cells.
- Setting a Day Order override on a Sunday re-resolved the whole day: dashboard Day Order, next
  class, today's list, the Today screen and free time all followed.
- Creating an assignment through the form produced the master task and, on *Plan my day*, the
  scheduler placed it at 17:25 — immediately after the last class plus commute and buffer.
- Deleting the assignment and the override left the database clean.

## Android artifact

`output/lifeos-preview.apk`, 37,888,174 bytes, arm64-v8a, application ID `com.personal.lifeos`,
minimum Android API 24, target API 36, version name 1.0.0. Built from the final source with
`scripts/build-android.ps1`; evidence in `output/android-final-build.log`.

SHA-256:

```text
CB36B3A368E55791D93121D1975AD14C56414653F1615D0A86A5297F33D01C93
```

Verified on the built artifact rather than assumed:

- `apksigner verify` passes; signed with the generated development key (v2 scheme).
- The manifest declares all five `AppWidgetProvider` receivers, each with its own
  `APPWIDGET_UPDATE` filter and provider metadata: LifeOS · Today's classes, Next class,
  Deadlines, Study next, Day Order.
- The packaged JS bundle contains the final source, spot-checked against strings introduced in
  the last edits.

This uses the generated development signing key. It suits personal acceptance testing, not a
Play Store release.

## Remaining device acceptance checks

No Android device was attached. A successful build does not establish runtime behaviour on a
phone. Install the APK on an arm64 Android phone and check:

1. Launch, confirm the eight subjects and the five Day Orders, capture an assignment, generate a
   plan and log partial completion.
2. Force-close and reopen; confirm records and any active focus timer persist. Repeat with no
   network connection.
3. Add each of the five launcher widgets, change a plan in the app, and confirm every placed
   widget updates and deep-links to the right screen.
4. Grant notification permission and verify the morning Day Order notice, a class reminder at
   the configured lead time, the deadline digest and an exam reminder. Check denial behaviour
   and next-day delivery.
5. Export a backup, restore it, and confirm the records. Check keyboard, safe areas and
   navigation on the device.
6. Cross the semester's first real holiday and confirm the rotation did not advance.

## Known gaps

- The four source screenshots never reached the build session. The course list, period times and
  Day Order resolutions came from the written brief and were cross-checked for internal
  consistency; the Academic Planner's holidays were **not** invented, so the calendar starts
  empty and the rotation anchor rests on one worked example. See `docs/ACADEMIC.md`.
- Ten grid cells are marked unverified. Each resolves to a free period for this student either
  way, so none can produce a wrong class, but they should be confirmed against the official
  timetable.
- Supabase transport and SQL ownership policies are prepared, but no live project or credentials
  were configured, and cloud login is not exposed in the UI.
- Importing a timetable from an image, PDF or CSV is designed for but not implemented.

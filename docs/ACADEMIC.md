# Academic module — verified model

Student: **K Srijai** · B.Tech Computer Science and Engineering · Semester 5 · Section L2 · Batch 2
Academic year **2026–27 ODD** · SRM Institute of Science and Technology, Kattankulathur.

## Source data and what was verified

The four screenshots referenced in the build request (unified Day Order timetable, personal
course registration, and the two Academic Planner pages) **did not reach this session** — the
request arrived as text only. Everything below is therefore derived from the written course
list and the written Day Order resolutions in that request, cross-checked for internal
consistency. Every value is editable in the app.

Cross-checks that were performed against the written data:

- Each stated class time was converted to a period index and re-derived from the period table.
  All 27 stated class periods resolve exactly. No stated time falls outside a period boundary.
- Each stated subject was matched to exactly one theory slot; no slot code is claimed by two
  subjects.
- The five Day Orders were replayed through the resolver and compared against the written
  "resulting timetable" for Day Orders 1–5. All match.

Cells that are **not** directly attested are stored with `verified = 0` and are surfaced in the
timetable editor with a "check this" marker. They are listed at the end of this document.

## Period table

Twelve periods. Internally minutes from midnight; the UI may display AM/PM.

| # | Time | Minutes | # | Time | Minutes |
|---|------|---------|---|------|---------|
| 1 | 08:00–08:50 | 480–530 | 7 | 13:25–14:15 | 805–855 |
| 2 | 08:50–09:40 | 530–580 | 8 | 14:20–15:10 | 860–910 |
| 3 | 09:45–10:35 | 585–635 | 9 | 15:10–16:00 | 910–960 |
| 4 | 10:40–11:30 | 640–690 | 10 | 16:00–16:50 | 960–1010 |
| 5 | 11:35–12:25 | 695–745 | 11 | 16:50–17:30 | 1010–1050 |
| 6 | 12:30–13:20 | 750–800 | 12 | 17:30–18:10 | 1050–1090 |

Periods 8→9 and 9→10 run back to back with no gap. Periods 11 and 12 are 40 minutes; the rest
are 50. Periods are rows in `periods` and can be edited without touching any other table.

## Registered courses

| Code | Course | Cr | Category | Type | Slots | Rooms | Faculty |
|------|--------|----|----------|------|-------|-------|---------|
| 21CSC302J | Computer Networks | 4 | Professional Core | Lab Based Theory | A · P1 · P2 | LH819 · TP013 | Dr. R. Brindha |
| 21CSE214T | GPU Computing | 3 | Professional Elective | Theory | B | CLS523 | P. Renuka Devi |
| 21MAB302T | Discrete Mathematics | 4 | Basic Science | Theory | C | LH819 | Dr. Dhanalakshmi R |
| 21CSC301T | Formal Language and Automata | 3 | Professional Core | Theory | D | LH819 | Dr. Anitha K |
| 21CSC305P | Machine Learning | 3 | Professional Core | Project Based Theory | F | LH819 | Dr. V. Kavitha |
| 21MGO111T | Entrepreneurial Finance | 3 | Open Elective | Theory | G | LH1105 | Yasmin Khatun |
| 21GNP301L | Community Connect | 1 | Project Course | Practical | L51 · L52 | — | Dr. R. Brindha |
| 21LEM301T | Indian Art Form | 0 | Mandatory | Theory | L11 · L12 | — | Dr. R. Brindha |

Slot **E** is not registered. Rooms for Community Connect and Indian Art Form were not supplied
and are blank rather than guessed.

## The resolution chain

```
subjects → courseSlots (slot code + kind + room)
                 ∩
periods × dayOrderSlots (the college-wide grid: Day Order × period → slot code)
                 ↓
        personal class for that period
                 ↓
academicCalendar gives the Day Order for a date
                 ↓
        classChanges apply per-date cancellations, room / time / faculty changes, extra classes
```

The college grid holds **every** college slot. A grid cell only becomes a class when its slot
code also appears in `courseSlots`. A cell whose code is unregistered — or blank — resolves to a
**free period**. This is the rule the module is built on; no subject name is ever attached to a
date directly. Consecutive periods resolving to the same subject and kind are merged into one
block, which is why the Computer Networks lab appears as a single 08:00–09:40 entry.

## The college grid as seeded

Blank means the cell is unassigned; for this student it resolves to free either way.
Cells marked `*` are unverified inferences (see below).

| Period | DO1 | DO2 | DO3 | DO4 | DO5 |
|--------|-----|-----|-----|-----|-----|
| 1 | P1* | B | | D | P41* |
| 2 | P2* | B | | D | P42* |
| 3 | | G | | B | P43* |
| 4 | | G | | E* | P44* |
| 5 | | A | | C | P45* |
| 6 | A | | C | P36* | E* |
| 7 | A | | C | P37* | E* |
| 8 | F | | A | P38* | C |
| 9 | F | | D | P39* | F |
| 10 | G | | B | P40* | D |
| 11 | L11 | | | L41* | L51 |
| 12 | L12 | | | L42* | L52 |

### Resulting personal timetable

- **DO1** — CN lab 08:00–09:40 · CN 12:30–14:15 · ML 14:20–16:00 · EF 16:00–16:50 · Indian Art Form 16:50–18:10
- **DO2** — GPU 08:00–09:40 · EF 09:45–11:30 · CN 11:35–12:25
- **DO3** — DM 12:30–14:15 · CN 14:20–15:10 · FLAT 15:10–16:00 · GPU 16:00–16:50
- **DO4** — FLAT 08:00–09:40 · GPU 09:45–10:35 · DM 11:35–12:25
- **DO5** — DM 14:20–15:10 · ML 15:10–16:00 · FLAT 16:00–16:50 · Community Connect 16:50–18:10

All five match the resolutions given in the build request.

## Day Order calendar

`academicCalendar` (the existing `calendar` table, extended) stores one row per exceptional date:
day type, an explicit Day Order, a free-text event title, a note, a `working` flag and a `source`.
A date with no row is an ordinary weekday or a weekend, decided by the configured weekend days.

The rotation advances **only across working days**, so a holiday or a weekend never consumes a
Day Order. `working` is the authority — not the label — which is what lets a "Special Working
Day" Saturday advance the rotation while a weekday "College Event" does not.

Rotation anchor: **2026-09-22 → Day Order 2**, taken from the worked example in the build
request. The Academic Planner screenshots were not available, so **no holidays have been
seeded** — inventing them would be worse than leaving them out. Add them under
Academic → Calendar, or set a different anchor there; both are editable and both immediately
re-derive every dependent view.

A manual override (`Announcement → "Tomorrow follows Day Order 4"`, or the override control on
any date) sets that date's order and the rotation continues forward from it.

## Unverified cells

These resolve to a free period for this student regardless of their true value, so they cannot
produce a wrong class. They are flagged so they can be corrected against the official timetable.

- DO1 periods 1–2 — recorded as `P1`/`P2`. The build request asked for the practical slot
  interpretation to be cross-checked; the times (08:00–09:40) are attested, the slot labels are not.
- DO4 period 4 — `E`. DO4 periods 6–10 — `P36`–`P40`. DO4 periods 11–12 — `L41`/`L42`.
- DO5 periods 1–5 — `P41`–`P45`. DO5 periods 6–7 — `E`.

Unassigned cells (DO1 3–5, DO2 6–12, DO3 1–5 and 11–12) were left blank rather than guessed.

## How Academic reaches the rest of LifeOS

Academic owns no scheduler of its own. It feeds the existing engines:

| Academic record | Becomes | Effect |
|---|---|---|
| Assignment | master task (`lifeArea: academic`, `subcategory: Assignment`) | ranked, split and scheduled by the existing planner |
| Assessment | master task + fixed calendar block | countdown, and revision work scheduled before it |
| Subject todo | master task on request | appears on Today and in free windows |
| Study session | master task with topic link | planned into free time before the exam |
| Resolved classes | fixed blocks in `fixedBlocks` | subtracted from free time, with commute either side |
| Free periods | genuine free slots | offered to the scheduler per the college-free-period setting |
| Cancelled class | block removed | the period returns to free time |

Completing the task writes progress back to the academic record, so neither side drifts.

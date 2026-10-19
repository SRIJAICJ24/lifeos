<div align="center">

# LifeOS

**Your entire life, one app, zero cloud.**

A private, offline-first personal life planner that unifies academics, habits, projects, skills, fitness and nutrition under a single intelligent engine. Built with Expo SDK 55, React Native, TypeScript, SQLite and Zustand.

[![Expo SDK](https://img.shields.io/badge/Expo_SDK-55-4630EB?logo=expo&logoColor=white)](https://expo.dev)
[![React Native](https://img.shields.io/badge/React_Native-0.83-61DAFB?logo=react&logoColor=black)](https://reactnative.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![SQLite](https://img.shields.io/badge/SQLite-Local_First-003B57?logo=sqlite&logoColor=white)](https://www.sqlite.org)
[![Tests](https://img.shields.io/badge/Tests-62_passing-brightgreen)]()

[Download APK](#-download) &bull; [Features](#-features) &bull; [Architecture](#-architecture) &bull; [Get Started](#-get-started)

</div>

---

## Why LifeOS?

Most productivity apps solve one thing. LifeOS connects everything: your **class schedule** feeds into **free time**, which powers **task scheduling**, which respects your **habits**, **workouts**, and **meal plans**. One engine, one database, one truth.

- **No account required** &mdash; runs entirely on your device
- **No internet needed** &mdash; SQLite stores everything locally
- **No subscription** &mdash; install and own it forever
- **Intelligent scheduling** &mdash; knows your classes, deadlines, habits and energy

---

## Download

> **[Latest APK Release](https://github.com/SRIJAICJ24/lifeos/releases/latest)**
>
> arm64 Android preview build (~38 MB). Transfer to your phone and install.
> Android will ask to allow installing from an unknown source &mdash; this is normal for sideloaded apps.

---

## Features

### Today &mdash; Your Command Center
- **Next up** card with upcoming task, time, and accent color
- **Task overview** showing remaining tasks by life area
- **Tomorrow preview** with due tasks and Day Order
- **Free time finder** with smart recommendations
- **One-tap planning** that generates a schedule respecting all constraints

### Academic Planner
- Full **Day Order rotation** (DO1&ndash;DO5) with holiday-aware advancement
- **Timetable** with periods, rooms, faculty and per-date class changes
- **Assignment & exam tracker** with deadlines, countdowns and prep percentage
- **Syllabus tracker** down to subtopics with coverage, study and revision tracking
- **Attendance** by hour with threshold forecasting
- **Study suggestions** ranked by deadline proximity, exam closeness and weak topics
- **Announcements** with actionable intents (Day Order change, deadline move, etc.)
- **Marks** with configurable weightage

### Habit Tracker
- **GitHub-style contribution graph** &mdash; 15 weeks, color-coded by completion
- **Month labels** and **day labels** for clear date context
- **Tap any tile** to see date, value, and status (Done / Partial / Missed)
- Four tracking types: boolean, counter, duration, quantity
- Streaks, 7-day rate, longest streak, and all-time completion rate
- One-tap check-in for boolean habits, backfill for past days

### Projects & Skills
- Project stages, milestones, notes and linked tasks
- Idea vault for capturing inspiration
- Skills with topics, resources, question banks and practice tasks
- Progress bars and completion tracking

### Fitness & Nutrition
- Workout plans with exercises, sets, reps, weights and rest timers
- Workout logging and body measurements
- Food logs with macros (calories, protein, carbs, fat)
- Water tracking with daily targets

### Smart Scheduling Engine
- Subtracts classes, commute, meals, events from your waking window
- Merges overlapping intervals, applies buffers
- Ranks tasks by deadline, importance and dependencies
- Splits long tasks into sessions, avoids tiny remainders
- Three intensity modes: Relaxed (60%), Balanced (75%), Focused (90%)
- Protects active focus sessions from being overwritten

### Notifications
- **Morning Day Order** with first class info
- **Class reminders** with configurable lead time
- **Deadline digest** for nearby due dates
- **Exam countdowns** for assessments within 3 days
- **Task block reminders** 5 minutes before each scheduled session
- **Tomorrow's tasks** summary in the evening
- **Weekly review** every Sunday &mdash; tasks completed, habits done, best streak
- Each category individually toggleable in Settings

### Android Home-Screen Widgets
Six native `AppWidgetProvider` widgets fed by a single persisted JSON snapshot:

| Widget | Size | Shows |
|--------|------|-------|
| Today's Classes | 4&times;3 | Every class with times and rooms |
| Next Class | 4&times;2 | What's next, when and where |
| Deadlines | 4&times;3 | Assignments and tests, nearest first |
| Study Next | 4&times;2 | Top study suggestion with reason |
| Day Order | 2&times;2 | Today's and tomorrow's Day Order |
| Life Overview | 4&times;3 | Tasks, projects, habits, weekly summary |

---

## Architecture

```
UI (Expo Router)
    |
Zustand Store (serialized mutations)
    |
LifeEngine (pure domain logic)
    |
Repository (normalized CRUD)
    |
SQLite (versioned migrations, foreign keys, transactions)
```

**Key design decisions:**
- Screens never contain scheduling algorithms &mdash; all logic lives in `src/domain/`
- Widget snapshot pattern: one JSON payload in SharedPreferences feeds all 6 widgets
- Notification IDs are stable &mdash; replanning replaces reminders instead of stacking
- Settings are key-value pairs &mdash; new settings need no migration
- Academic calendar uses a working-day-only rotation &mdash; holidays never consume a Day Order

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the full design, and [docs/ACADEMIC.md](docs/ACADEMIC.md) for the academic model.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Expo SDK 55 + React Native 0.83 |
| Language | TypeScript (strict mode) |
| Navigation | Expo Router (file-based) |
| Database | SQLite via expo-sqlite (WASM on web) |
| State | Zustand |
| Notifications | expo-notifications |
| Widgets | Custom Expo native module (Kotlin) |
| Testing | Node.js native test runner + real SQLite |

---

## Get Started

### Prerequisites
- Node.js 22 LTS
- npm

### Web Preview

```bash
npm ci
npm run web
```

Open **http://localhost:8081**. Keep the terminal running &mdash; the server provides isolation headers required by SQLite's WASM worker.

### Android

```bash
npm start
```

Open in Expo Go (SDK 55 compatible) for basic features. Widgets and notifications require a native build.

### Build APK

Requirements: JDK 17, Android SDK 36

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\build-android.ps1
```

Outputs `output/lifeos-preview.apk` (arm64, ~38 MB).

### Run Tests

```bash
npm run check       # TypeScript strict check
npm run build:web    # Web production build
npm test            # 62 tests (migrations, scheduling, engine)
```

---

## Project Structure

```
lifeos/
  app/                    # Expo Router pages
    academic/             # Academic sub-screens
    area/                 # Life area screens (habits, fitness, diet, etc.)
    subject/              # Per-subject views
    task/                 # Task detail and focus timer
  src/
    domain/               # Pure business logic (scheduling, timetable, analytics)
    screens/              # Screen components (Habits, Fitness, Diet, Academic)
    services/             # Side effects (notifications, widgets, backup)
    state/                # Zustand store
    data/                 # SQLite database, migrations, repository
    ui/                   # Shared components and theme
  modules/
    lifeos-widget/        # Custom Expo native module for Android widgets (Kotlin)
  docs/                   # Architecture, academic model, QA, schema
  scripts/                # Build and patch scripts
  tests/                  # Integration and unit tests
```

---

## First Use

1. Install the APK and open LifeOS
2. Go to **Me &rarr; Settings** and set your wake/sleep times, commute, meals and planning intensity
3. Confirm the Day Order rotation anchor
4. Add holidays and exam dates under **Academic &rarr; Academic Calendar**
5. Build out your syllabus, capture tasks, create habits
6. Hit **Plan my day** on the Today screen

---

## Database

`lifeos.db` uses versioned migrations with normalized tables, foreign keys and transactional writes. The full schema is in [docs/sqlite-schema.sql](docs/sqlite-schema.sql). Source of truth: [src/data/migrations.ts](src/data/migrations.ts).

Each browser origin and each phone installation maintain separate databases. Export backups from **Me &rarr; Your data** before switching devices.

---

## Known Limitations

- iOS WidgetKit extensions are not yet implemented
- Overnight waking windows (sleep before wake) are not supported
- Dependency editing UI is not included (data model is ready)
- Web notifications are not available (Android/iOS only)
- Database is not application-level encrypted
- Supabase auth is coded but no live cloud project is configured

---

<div align="center">

**Built for one person. Built to last.**

*All your data stays on your device. Always.*

</div>

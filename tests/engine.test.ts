import { test } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { emptyData, CalendarDate, defaultSettings } from "../src/domain/types";
import { dayOrder } from "../src/domain/dayOrder";
import { freeTime, availability } from "../src/domain/freeTime";
import { priority, recommendations } from "../src/domain/priority";
import { schedule, nextSlot, intensityRatio } from "../src/domain/scheduling";
import { Repository, Database } from "../src/data/repository";
import { newTask, seed } from "../src/data/seed";
import { LifeEngine } from "../src/services/lifeEngine";
import {
  addDays,
  addMonths,
  dateKey,
  minutes,
  validDate,
} from "../src/domain/time";
import { habitStats, analytics } from "../src/domain/analytics";
import { exportBackup, importBackup } from "../src/services/backup";
import { widgetSnapshot } from "../src/services/widget";
function fixture() {
  const d = emptyData();
  d.settings = {
    ...defaultSettings,
    anchorDate: "2026-09-07",
    anchorOrder: 1,
    buffer: 0,
  };
  return d;
}
const holiday: CalendarDate = {
  date: "2026-09-09",
  type: "Holiday",
  dayOrder: null,
  note: "",
  eventTitle: "",
  working: 0,
  source: "Test",
};
test("Monday DO1 Tuesday DO2, holiday Wednesday, Thursday DO3", () => {
  const d = fixture();
  assert.equal(dayOrder("2026-09-07", [holiday], d.settings).order, 1);
  assert.equal(dayOrder("2026-09-08", [holiday], d.settings).order, 2);
  assert.equal(dayOrder("2026-09-09", [holiday], d.settings).order, null);
  assert.equal(dayOrder("2026-09-10", [holiday], d.settings).order, 3);
});
test("Manual override is authoritative and continues next academic day", () => {
  const d = fixture();
  d.calendar = [
    {
      ...holiday,
      date: "2026-09-08",
      type: "Manual Override",
      dayOrder: 4,
      working: 1,
    },
  ];
  assert.equal(dayOrder("2026-09-08", d.calendar, d.settings).order, 4);
  assert.equal(dayOrder("2026-09-09", d.calendar, d.settings).order, 5);
});
test("Exam and non-academic dates pause rotation", () => {
  const d = fixture();
  for (const type of ["Exam Day", "No Class", "College Event"] as const) {
    const entries = [{ ...holiday, type }];
    assert.equal(dayOrder("2026-09-09", entries, d.settings).order, null);
    assert.equal(dayOrder("2026-09-10", entries, d.settings).order, 3);
  }
});
test("Special timetable maps to configured order", () => {
  const d = fixture();
  assert.equal(
    dayOrder(
      "2026-09-12",
      [
        {
          ...holiday,
          date: "2026-09-12",
          type: "Special Timetable",
          dayOrder: 2,
          working: 1,
        },
      ],
      d.settings,
    ).order,
    2,
  );
});
test("A special working Saturday advances the rotation; a weekday event does not", () => {
  const d = fixture();
  const saturday = {
    ...holiday,
    date: "2026-09-12",
    type: "Special Working Day" as const,
    working: 1,
  };
  // Mon DO1 … Fri DO5, working Saturday takes DO1, so Monday continues at DO2.
  assert.equal(dayOrder("2026-09-12", [saturday], d.settings).order, 1);
  assert.equal(dayOrder("2026-09-14", [saturday], d.settings).order, 2);
  const event = {
    ...holiday,
    date: "2026-09-09",
    type: "College Event" as const,
  };
  assert.equal(dayOrder("2026-09-09", [event], d.settings).order, null);
  assert.equal(dayOrder("2026-09-10", [event], d.settings).order, 3);
});
test("Weekends pause and order wraps after 5", () => {
  const d = fixture();
  assert.equal(dayOrder("2026-09-12", [], d.settings).order, null);
  assert.equal(dayOrder("2026-09-14", [], d.settings).order, 1);
});
test("Required free-time example yields exactly 570 minutes", () => {
  assert.deepEqual(
    freeTime(420, 1410, [
      { start: 480, end: 780 },
      { start: 810, end: 840 },
      { start: 1080, end: 1140 },
    ]),
    [
      { start: 420, end: 480 },
      { start: 780, end: 810 },
      { start: 840, end: 1080 },
      { start: 1140, end: 1410 },
    ],
  );
});
test("Overlapping and nested blocks merge before subtracting", () => {
  assert.deepEqual(
    freeTime(0, 120, [
      { start: 10, end: 60 },
      { start: 30, end: 90 },
      { start: 40, end: 50 },
    ]),
    [
      { start: 0, end: 10 },
      { start: 90, end: 120 },
    ],
  );
});
test("No free time and invalid waking window return empty", () => {
  assert.deepEqual(freeTime(420, 600, [{ start: 0, end: 1440 }]), []);
  assert.deepEqual(freeTime(600, 420, []), []);
});
test("Buffer, clipping and current time are respected", () => {
  assert.deepEqual(freeTime(420, 600, [{ start: 500, end: 550 }], 10, 450), [
    { start: 450, end: 490 },
    { start: 560, end: 600 },
  ]);
});
test("Changing wake / sleep changes availability", () => {
  const d = fixture();
  d.settings.weekends = "0,1,2,3,4,5,6";
  const before = availability(d, "2026-09-07").reduce(
    (n, s) => n + s.end - s.start,
    0,
  );
  d.settings.wake += 60;
  assert.equal(
    availability(d, "2026-09-07").reduce((n, s) => n + s.end - s.start, 0),
    before - 60,
  );
});
test("Overdue assignment outranks low priority project", () => {
  const d = fixture(),
    a = { ...newTask("Assignment", "academic", "a"), deadline: "2026-09-06" },
    p = newTask("Project", "projects", "p");
  assert.ok(priority(a, "2026-09-07", d) > priority(p, "2026-09-07", d));
});
test("Same deadline tie has deterministic ordering", () => {
  const d = fixture();
  d.tasks = ["b", "a"].map((id) => ({
    ...newTask(id, "academic", id),
    deadline: "2026-09-08",
    createdAt: "same",
  }));
  assert.deepEqual(
    recommendations(d, "2026-09-07", 60).map((t) => t.id),
    ["a", "b"],
  );
});
test("Dependencies exclude blocked work", () => {
  const d = fixture();
  d.tasks = [newTask("a", "personal", "a"), newTask("b", "personal", "b")];
  d.dependencies = [{ id: "dep", taskId: "b", dependsOnId: "a" }];
  assert.deepEqual(
    recommendations(d, "2026-09-07", 60).map((t) => t.id),
    ["a"],
  );
});
test("Unsplit task larger than free slot is excluded", () => {
  const d = fixture();
  d.tasks = [
    {
      ...newTask("Large", "personal", "a"),
      estimatedDuration: 120,
      splittable: 0,
    },
  ];
  assert.equal(recommendations(d, "2026-09-07", 45).length, 0);
  d.tasks[0]!.splittable = 1;
  assert.equal(recommendations(d, "2026-09-07", 45).length, 1);
});
test("Scheduler prioritizes assignment and retains smaller fitting tasks", () => {
  const d = fixture();
  d.settings = {
    ...d.settings,
    wake: 420,
    sleep: 570,
    weekends: "0,1,2,3,4,5,6",
    intensity: "Focused",
  };
  d.tasks = [
    {
      ...newTask("Assignment", "academic", "a"),
      deadline: "2026-09-08",
      estimatedDuration: 90,
      priority: 3,
      minimumSessionLength: 30,
    },
    { ...newTask("DSA", "skills", "d"), estimatedDuration: 15 },
    {
      ...newTask("Project", "projects", "p"),
      estimatedDuration: 45,
      priority: 1,
    },
  ];
  const plan = schedule(d, "2026-09-07");
  assert.equal(plan[0]!.taskId, "a");
  assert.ok(plan.some((b) => b.taskId === "d"));
  assert.ok(plan.reduce((n, b) => n + b.end - b.start, 0) <= 135);
});
test("Intensity caps all three plans and does not create small fragments", () => {
  for (const intensity of ["Relaxed", "Balanced", "Focused"] as const) {
    const d = fixture();
    d.settings = {
      ...d.settings,
      wake: 420,
      sleep: 720,
      weekends: "0,1,2,3,4,5,6",
      intensity,
    };
    d.tasks = [
      {
        ...newTask("Long", "personal", "a"),
        estimatedDuration: 1000,
        minimumSessionLength: 30,
      },
    ];
    const p = schedule(d, "2026-09-07");
    assert.ok(
      p.reduce((n, b) => n + b.end - b.start, 0) <=
        300 * intensityRatio[intensity],
    );
    assert.ok(p.every((b) => b.end - b.start >= 30));
    for (let i = 1; i < p.length; i++) assert.ok(p[i]!.start >= p[i - 1]!.end);
  }
});
test("Completed and skipped tasks stay out of recommendations", () => {
  const d = fixture();
  d.tasks = [
    { ...newTask("a"), status: "Completed", progress: 100 },
    { ...newTask("b"), status: "Skipped" },
  ];
  assert.equal(recommendations(d, "2026-09-07", 100).length, 0);
});
test("Next free slot searches tomorrow when today is full", () => {
  const d = fixture();
  d.tasks = [newTask("a", "personal", "a")];
  d.blocks = [
    {
      id: "full",
      date: "2026-09-07",
      start: 0,
      end: 1440,
      kind: "event",
      taskId: null,
      status: "Scheduled",
      title: "Full",
    },
  ];
  assert.equal(nextSlot(d, "a", "2026-09-07")?.date, "2026-09-08");
});
test("Partial progress reduces scheduled remaining work", () => {
  const d = fixture();
  d.tasks = [
    { ...newTask("a", "personal", "a"), estimatedDuration: 120, progress: 75 },
  ];
  assert.equal(
    schedule(d, "2026-09-07").reduce((n, b) => n + b.end - b.start, 0),
    30,
  );
});
test("Time and date input reject malformed values", () => {
  assert.throws(() => minutes("25:00"));
  assert.throws(() => minutes("7:00"));
  assert.equal(validDate("2026-02-30"), false);
  assert.equal(validDate("2026-09-12"), true);
});
test("Month navigation clamps month-end dates rather than skipping a month", () => {
  assert.equal(addMonths("2026-01-31", 1), "2026-02-28");
  assert.equal(addMonths("2026-03-31", -1), "2026-02-28");
});
function adapter(db: DatabaseSync): Database {
  return {
    execAsync: async (sql) => {
      db.exec(sql);
    },
    runAsync: async (sql, ...p) => db.prepare(sql).run(...p),
    getAllAsync: async <T>(sql: string, ...p: any[]) =>
      db.prepare(sql).all(...p) as T[],
    withTransactionAsync: async (fn) => {
      db.exec("BEGIN");
      try {
        await fn();
        db.exec("COMMIT");
      } catch (e) {
        db.exec("ROLLBACK");
        throw e;
      }
    },
  };
}
async function memory() {
  const db = new DatabaseSync(":memory:");
  const repo = new Repository(adapter(db));
  await repo.migrate();
  return { db, repo, engine: new LifeEngine(repo) };
}
test("Migrations and seed are idempotent; snapshot is derived", async () => {
  const { db, repo, engine } = await memory();
  await seed(repo);
  await seed(repo);
  await repo.migrate();
  const d = await engine.snapshot();
  assert.equal(d.subjects.length, 8);
  assert.equal(d.periods.length, 12);
  assert.equal(d.courseSlots.length, 12);
  assert.equal(d.syllabusUnits.length, 40);
  // A fresh install carries the semester setup and nothing invented.
  assert.equal(d.tasks.length, 0);
  assert.equal(d.habits.length, 0);
  assert.equal(d.projects.length, 0);
  assert.equal(d.skills.length, 0);
  assert.equal(d.meals.length, 0);
  assert.equal(d.workouts.length, 0);
  assert.equal(d.settings.demo, 0);
  db.close();
});
test("SQLite data survives closing and reopening real database file", async () => {
  const dir = mkdtempSync(join(tmpdir(), "lifeos-test-")),
    file = join(dir, "lifeos.db");
  let db = new DatabaseSync(file);
  let repo = new Repository(adapter(db));
  await repo.migrate();
  await repo.upsert(
    "tasks",
    newTask("Persistent assignment", "academic", "persist"),
  );
  db.close();
  db = new DatabaseSync(file);
  repo = new Repository(adapter(db));
  await repo.migrate();
  assert.equal((await repo.read()).tasks[0]?.title, "Persistent assignment");
  db.close();
  rmSync(dir, { recursive: true });
});
test("Task completion logs actual time, habit once and recurrence", async () => {
  const { db, repo, engine } = await memory(),
    today = dateKey();
  await repo.upsert("habits", {
    id: "h",
    title: "DSA",
    type: "duration",
    target: 30,
    unit: "min",
    duration: 30,
    startDate: today,
  });
  await engine.save("tasks", {
    ...newTask("DSA", "skills", "t"),
    habitId: "h",
    recurrence: "daily",
    deadline: today,
  });
  await engine.finish("t", "Completed", 30, 100);
  const d = await repo.read();
  assert.equal(d.sessions.length, 1);
  assert.equal(d.habitLogs[0]?.value, 30);
  assert.equal(d.tasks.length, 2);
  assert.equal(
    d.tasks.find((t) => t.parentId === "t")?.deadline,
    addDays(today, 1),
  );
  await assert.rejects(() => engine.finish("t", "Completed", 30, 100));
  assert.equal((await repo.read()).habitLogs[0]?.value, 30);
  db.close();
});
test("Partial session, missed session and reschedule are persisted", async () => {
  const { db, repo, engine } = await memory();
  await engine.save("tasks", {
    ...newTask("Task", "personal", "t"),
    estimatedDuration: 120,
  });
  await engine.finish("t", "Partially completed", 40, 35);
  let d = await repo.read();
  assert.equal(d.tasks[0]?.actualDuration, 40);
  assert.equal(d.tasks[0]?.progress, 35);
  await engine.reschedule("t", "Tomorrow");
  d = await repo.read();
  assert.equal(d.tasks[0]?.status, "Scheduled");
  assert.equal(d.blocks[0]?.date, addDays(dateKey(), 1));
  await engine.reschedule("t", "Keep unscheduled");
  assert.equal((await repo.read()).tasks[0]?.status, "Not Started");
  await engine.reschedule("t", "Skip today");
  assert.equal((await repo.read()).tasks[0]?.status, "Skipped");
  db.close();
});
test("Deleting task cascades sessions and scheduled blocks", async () => {
  const { db, repo, engine } = await memory();
  await engine.save("tasks", newTask("Task", "personal", "t"));
  await engine.reschedule("t", "Tomorrow");
  await engine.finish("t", "Partially completed", 10, 30);
  await repo.remove("tasks", "t");
  const d = await repo.read();
  assert.equal(d.sessions.length, 0);
  assert.equal(d.blocks.length, 0);
  db.close();
});
test("Habit task generation is idempotent", async () => {
  const { db, repo, engine } = await memory();
  await seed(repo);
  await repo.upsert("habits", {
    id: "h",
    title: "Move your body",
    type: "boolean",
    target: 1,
    unit: "done",
    duration: 30,
    startDate: dateKey(),
  });
  await engine.ensureHabits(dateKey());
  const count = (await repo.read()).tasks.length;
  await engine.ensureHabits(dateKey());
  assert.equal((await repo.read()).tasks.length, count);
  db.close();
});
test("Habit logs upsert same day and expose consistency beyond streak", async () => {
  const { db, repo, engine } = await memory();
  await repo.upsert("habits", {
    id: "h",
    title: "Read",
    type: "quantity",
    target: 20,
    unit: "pages",
    duration: 20,
    startDate: dateKey(),
  });
  await engine.logHabit("h", 10);
  await engine.logHabit("h", 20);
  const d = await repo.read(),
    stats = habitStats(d.habits[0]!, d, dateKey());
  assert.equal(d.habitLogs.length, 1);
  assert.equal(stats.streak, 1);
  assert.equal(stats.total, 1);
  db.close();
});
test("Backup round trip and corrupt restore rollback", async () => {
  const { db, repo, engine } = await memory();
  await seed(repo);
  await engine.save("tasks", {
    ...newTask("Revise", "academic", "t"),
    subjectId: "cn",
  });
  const backup = exportBackup(await repo.read());
  await repo.clear();
  assert.equal((await repo.read()).tasks.length, 0);
  await importBackup(repo, backup);
  assert.equal((await repo.read()).subjects.length, 8);
  const corrupt = JSON.parse(backup);
  corrupt.data.tasks[0].subjectId = "missing";
  await assert.rejects(() => importBackup(repo, JSON.stringify(corrupt)));
  assert.equal((await repo.read()).subjects.length, 8);
  db.close();
});
test("Empty database and analytics are safe", async () => {
  const { db, repo, engine } = await memory();
  const d = await engine.snapshot();
  assert.equal(analytics(d, dateKey()).actual, 0);
  assert.equal(widgetSnapshot(d).nextClass, null);
  assert.ok(Array.isArray(schedule(d, dateKey())));
  db.close();
});
test("Invalid duration and settings leave existing data intact", async () => {
  const { db, repo, engine } = await memory();
  await assert.rejects(() =>
    engine.save("tasks", { ...newTask("Bad"), estimatedDuration: 0 }),
  );
  await assert.rejects(() =>
    engine.settings({ ...defaultSettings, wake: 1000, sleep: 900 }),
  );
  assert.equal((await repo.read()).tasks.length, 0);
  db.close();
});

test("Planning two days does not reserve the same remaining work twice", async () => {
  const { db, repo, engine } = await memory();
  const tomorrow = addDays(dateKey(), 1);
  await engine.save("tasks", {
    ...newTask("Multi-day", "personal", "t"),
    estimatedDuration: 60,
  });
  await engine.generate(tomorrow);
  await engine.generate(addDays(tomorrow, 1));
  const rows = (await repo.read()).blocks.filter((b) => b.taskId === "t");
  assert.equal(
    rows.reduce((n, b) => n + b.end - b.start, 0),
    60,
  );
  db.close();
});
test("Past missed sessions do not prevent new scheduling and remain in history", async () => {
  const { db, repo, engine } = await memory();
  await engine.save("tasks", newTask("Missed", "personal", "t"));
  await repo.upsert("blocks", {
    id: "old",
    date: addDays(dateKey(), -1),
    start: 600,
    end: 630,
    title: "Missed",
    kind: "session",
    taskId: "t",
    status: "Scheduled",
  });
  await engine.generate(addDays(dateKey(), 1));
  const d = await repo.read();
  assert.equal(d.blocks.find((b) => b.id === "old")?.status, "Missed");
  assert.ok(d.blocks.some((b) => b.taskId === "t" && b.status === "Scheduled"));
  db.close();
});
test("Skip today becomes available the following day", async () => {
  const { db, repo, engine } = await memory();
  await engine.save("tasks", newTask("Skip", "personal", "t"));
  await engine.reschedule("t", "Skip today");
  await engine.rollover(addDays(dateKey(), 1), 0);
  assert.equal((await repo.read()).tasks[0]?.status, "Not Started");
  db.close();
});
test("Editing fixed events reconciles existing generated plans without collisions", async () => {
  const { db, repo, engine } = await memory();
  const date = addDays(dateKey(), 1);
  await engine.save("tasks", {
    ...newTask("Work", "personal", "t"),
    estimatedDuration: 120,
  });
  await engine.generate(date);
  const before = await repo.read();
  const slot = before.blocks.find((b) => b.taskId === "t")!;
  await engine.save("blocks", {
    id: "event",
    date,
    start: slot.start,
    end: slot.end,
    title: "Appointment",
    kind: "event",
    taskId: null,
    status: "Scheduled",
  });
  await engine.reconcile(before);
  const d = await repo.read();
  assert.ok(
    d.blocks
      .filter((b) => b.kind === "session" && b.status === "Scheduled")
      .every((b) => b.end <= slot.start || b.start >= slot.end),
  );
  db.close();
});
test("Focus session is persisted, cannot be double-booked, and closes on logging", async () => {
  const { db, repo, engine } = await memory();
  await engine.save("tasks", newTask("Focus", "personal", "a"));
  await engine.save("tasks", newTask("Other", "personal", "b"));
  const focus = await engine.startFocus("a");
  assert.ok(focus.planned > 0);
  await assert.rejects(() => engine.startFocus("b"));
  await engine.generate(dateKey());
  let d = await repo.read();
  assert.equal(d.blocks.filter((b) => b.taskId === "a").length, 1);
  assert.equal(d.blocks.find((b) => b.taskId === "a")?.status, "In Progress");
  await engine.finish("a", "Partially completed", 10, 30);
  d = await repo.read();
  assert.equal(
    d.blocks.find((b) => b.taskId === "a")?.status,
    "Partially Completed",
  );
  assert.equal(
    (await repo.db.getAllAsync("SELECT * FROM settings WHERE key=?", "focus-a"))
      .length,
    0,
  );
  db.close();
});
test("Workout scheduling respects preferred time", () => {
  const d = fixture();
  d.tasks = [
    {
      ...newTask("Workout", "fitness", "w"),
      estimatedDuration: 40,
      splittable: 0,
    },
  ];
  const p = schedule(d, "2026-09-07");
  assert.ok(p.length > 0);
  assert.ok(p.every((b) => b.start >= d.settings.workoutTime));
});
test("Splitting avoids leaving a tiny tail where two valid sessions fit", () => {
  const d = fixture();
  d.settings = {
    ...d.settings,
    wake: 420,
    sleep: 600,
    weekends: "0,1,2,3,4,5,6",
    intensity: "Focused",
  };
  d.blocks = [
    {
      id: "event",
      date: "2026-09-07",
      start: 460,
      end: 500,
      title: "Event",
      kind: "event",
      taskId: null,
      status: "Scheduled",
    },
  ];
  d.tasks = [
    {
      ...newTask("Split", "personal", "s"),
      estimatedDuration: 65,
      minimumSessionLength: 30,
    },
  ];
  const p = schedule(d, "2026-09-07");
  assert.deepEqual(
    p.map((b) => b.end - b.start),
    [35, 30],
  );
});

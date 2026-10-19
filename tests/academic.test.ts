import { test } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Repository, Database } from "../src/data/repository";
import { migrations } from "../src/data/migrations";
import { seed } from "../src/data/seed";
import { LifeEngine } from "../src/services/lifeEngine";
import { dayOrder } from "../src/domain/dayOrder";
import { availability } from "../src/domain/freeTime";
import { activeClasses, classesOn, timetableFor } from "../src/domain/timetable";
import {
  assessmentPreparation,
  assignmentOpen,
  awaitingSubmission,
  attendanceStats,
  deadlines,
  risks,
  subjectAttendance,
  syllabusProgress,
} from "../src/domain/academic";
import { studySuggestions } from "../src/domain/study";
import { widgetSnapshot } from "../src/services/widget";
import { exportBackup, importBackup } from "../src/services/backup";
import { addDays, dateKey } from "../src/domain/time";
import { Data } from "../src/domain/types";
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
async function academic() {
  const db = new DatabaseSync(":memory:");
  const repo = new Repository(adapter(db));
  await repo.migrate();
  await seed(repo);
  return { db, repo, engine: new LifeEngine(repo) };
}
/** Anchor is 2026-09-22 → Day Order 2, so the surrounding weekdays are DO1 … DO5. */
const DAY = {
  1: "2026-09-21",
  2: "2026-09-22",
  3: "2026-09-23",
  4: "2026-09-24",
  5: "2026-09-25",
} as const;
/** Attendance may only be recorded up to today, so find a real past day of that Day Order. */
function pastDay(data: Data, order: number) {
  for (let i = 1; i < 30; i++) {
    const date = addDays(dateKey(), -i);
    if (dayOrder(date, data.calendar, data.settings).order === order)
      return date;
  }
  throw new Error("No recent day with that Day Order");
}
const shape = (data: Data, date: string) =>
  classesOn(data, date).map((c) => [
    data.subjects.find((s) => s.id === c.subjectId)?.shortName,
    c.start,
    c.end,
  ]);
test("Day Order 1 resolves the registered classes, labs merged into one block", async () => {
  const { db, repo } = await academic();
  const data = await repo.read();
  assert.deepEqual(shape(data, DAY[1]), [
    ["CN", 480, 580],
    ["CN", 750, 855],
    ["ML", 860, 960],
    ["EF", 960, 1010],
    ["IAF", 1010, 1090],
  ]);
  assert.equal(classesOn(data, DAY[1])[0]?.kind, "Lab");
  db.close();
});
test("Day Orders 2 to 5 resolve exactly the registered slots", async () => {
  const { db, repo } = await academic();
  const data = await repo.read();
  assert.deepEqual(shape(data, DAY[2]), [
    ["GPU", 480, 580],
    ["EF", 585, 690],
    ["CN", 695, 745],
  ]);
  assert.deepEqual(shape(data, DAY[3]), [
    ["DM", 750, 855],
    ["CN", 860, 910],
    ["FLAT", 910, 960],
    ["GPU", 960, 1010],
  ]);
  assert.deepEqual(shape(data, DAY[4]), [
    ["FLAT", 480, 580],
    ["GPU", 585, 635],
    ["DM", 695, 745],
  ]);
  assert.deepEqual(shape(data, DAY[5]), [
    ["DM", 860, 910],
    ["ML", 910, 960],
    ["FLAT", 960, 1010],
    ["CC", 1010, 1090],
  ]);
  db.close();
});
test("A college slot the student is not registered for stays free", async () => {
  const { db, repo } = await academic();
  const data = await repo.read();
  // Slot E sits in Day Order 4 period 4, and P41–P45 fill the Day Order 5 morning.
  assert.ok(
    data.dayOrderSlots.some((s) => s.dayOrder === 4 && s.slotCode === "E"),
  );
  assert.equal(
    classesOn(data, DAY[4]).some((c) => c.start < 690 && c.end > 640),
    false,
  );
  assert.equal(
    classesOn(data, DAY[5]).some((c) => c.start < 745),
    false,
  );
  // And an unregistered code never resolves to a subject anywhere in the grid.
  for (const order of [1, 2, 3, 4, 5])
    for (const instance of timetableFor(data, order))
      assert.ok(
        data.courseSlots.some((c) =>
          instance.slotCode.split(" · ").includes(c.slotCode),
        ),
      );
  db.close();
});
test("A holiday shows no timetable and does not consume a Day Order", async () => {
  const { db, repo, engine } = await academic();
  await engine.setDayOrder(DAY[3], null, "Holiday", "Festival");
  const data = await repo.read();
  assert.equal(dayOrder(DAY[3], data.calendar, data.settings).order, null);
  assert.deepEqual(classesOn(data, DAY[3]), []);
  // Thursday now takes the Day Order Wednesday would have had.
  assert.equal(dayOrder(DAY[4], data.calendar, data.settings).order, 3);
  db.close();
});
test("A manual override changes the day's classes immediately", async () => {
  const { db, repo, engine } = await academic();
  await engine.setDayOrder(DAY[2], 4, "Manual Override", "Announced in class");
  const data = await repo.read();
  assert.equal(dayOrder(DAY[2], data.calendar, data.settings).order, 4);
  assert.deepEqual(shape(data, DAY[2]), [
    ["FLAT", 480, 580],
    ["GPU", 585, 635],
    ["DM", 695, 745],
  ]);
  db.close();
});
test("An assignment becomes a master task, and finishing it feeds back", async () => {
  const { db, repo, engine } = await academic();
  const today = dateKey();
  await engine.saveAssignment({
    id: "a1",
    subjectId: "cn",
    title: "Subnetting worksheet",
    description: "",
    assignedDate: today,
    dueDate: addDays(today, 2),
    dueTime: "23:59",
    estimatedDuration: 90,
    priority: 3,
    maximumMarks: 10,
    awardedMarks: -1,
    submissionType: "Upload",
    submissionLocation: "",
    status: "Not started",
    progress: 0,
    attachments: "",
    notes: "",
    facultyInstructions: "",
    submittedAt: "",
    submissionConfirmed: 0,
    taskId: null,
  });
  let data = await repo.read();
  const task = data.tasks.find((t) => t.id === "assignment-a1");
  assert.ok(task);
  assert.equal(task!.lifeArea, "academic");
  assert.equal(task!.subjectId, "cn");
  assert.equal(task!.subcategory, "Assignment");
  assert.equal(task!.deadline, addDays(today, 2));
  assert.equal(task!.estimatedDuration, 90);
  // Partial work moves the assignment along without claiming it is done.
  await engine.finish("assignment-a1", "Partially completed", 30, 40);
  data = await repo.read();
  assert.equal(data.assignments[0]?.progress, 40);
  assert.equal(data.assignments[0]?.status, "In progress");
  // Finishing the work is not the same as having submitted it.
  await engine.finish("assignment-a1", "Completed", 60, 100);
  data = await repo.read();
  assert.equal(data.assignments[0]?.progress, 100);
  assert.equal(data.assignments[0]?.status, "Ready to submit");
  assert.equal(awaitingSubmission(data.assignments[0]!), true);
  assert.equal(assignmentOpen(data.assignments[0]!), true);
  await engine.confirmSubmission("a1", true);
  data = await repo.read();
  assert.equal(data.assignments[0]?.status, "Submitted");
  assert.equal(awaitingSubmission(data.assignments[0]!), false);
  assert.ok(data.assignments[0]?.submittedAt);
  db.close();
});
test("Editing a due date moves the deadline everywhere at once", async () => {
  const { db, repo, engine } = await academic();
  const today = dateKey();
  const base = {
    id: "a1",
    subjectId: "dm",
    title: "Relations sheet",
    description: "",
    assignedDate: today,
    dueDate: addDays(today, 5),
    dueTime: "23:59",
    estimatedDuration: 60,
    priority: 2,
    maximumMarks: 0,
    awardedMarks: -1,
    submissionType: "",
    submissionLocation: "",
    status: "Not started",
    progress: 0,
    attachments: "",
    notes: "",
    facultyInstructions: "",
    submittedAt: "",
    submissionConfirmed: 0,
    taskId: null,
  };
  await engine.saveAssignment(base);
  await engine.saveAssignment({ ...base, dueDate: addDays(today, 1) });
  const data = await repo.read();
  assert.equal(data.assignments.length, 1);
  assert.equal(data.tasks.filter((t) => t.id === "assignment-a1").length, 1);
  assert.equal(
    data.tasks.find((t) => t.id === "assignment-a1")?.deadline,
    addDays(today, 1),
  );
  assert.equal(deadlines(data, today)[0]?.days, 1);
  db.close();
});
test("An overdue assignment is surfaced rather than quietly dropped", async () => {
  const { db, repo, engine } = await academic();
  const today = dateKey();
  await engine.saveAssignment({
    id: "late",
    subjectId: "flat",
    title: "Pumping lemma set",
    description: "",
    assignedDate: addDays(today, -9),
    dueDate: addDays(today, -2),
    dueTime: "23:59",
    estimatedDuration: 45,
    priority: 2,
    maximumMarks: 0,
    awardedMarks: -1,
    submissionType: "",
    submissionLocation: "",
    status: "Not started",
    progress: 0,
    attachments: "",
    notes: "",
    facultyInstructions: "",
    submittedAt: "",
    submissionConfirmed: 0,
    taskId: null,
  });
  const data = await repo.read();
  assert.equal(deadlines(data, today)[0]?.days, -2);
  assert.ok(risks(data, today).some((r) => r.id === "due-late"));
  assert.ok(studySuggestions(data, today, 60)[0]?.reason.includes("Past its due"));
  db.close();
});
async function withSyllabus(engine: LifeEngine, repo: Repository) {
  const topics = ["Subnetting", "CIDR", "VLSM", "NAT"];
  for (const [i, title] of topics.entries())
    await engine.save("syllabusTopics", {
      id: `t${i}`,
      unitId: "unit-cn-2",
      subjectId: "cn",
      parentId: null,
      position: i + 1,
      title,
      state: "Not started",
      classCovered: 1,
      notesCompleted: 0,
      conceptUnderstood: 0,
      practiceCompleted: 0,
      revisionCount: 0,
      confidence: 0,
      lastRevised: "",
      nextRevision: "",
      importance: i === 2 ? 2 : 0,
      teacherImportant: 0,
      weak: 0,
      pyqCount: 0,
      pyqYears: "",
      pyqMarks: "",
      pyqDifficulty: "",
      pyqSolved: 0,
      estimatedMinutes: 30,
      resourceLinks: "",
      personalNotes: "",
    });
  return repo.read();
}
test("Exam preparation tracks the topics linked to it", async () => {
  const { db, repo, engine } = await academic();
  const today = dateKey();
  await withSyllabus(engine, repo);
  await engine.saveAssessment({
    id: "ft2",
    subjectId: "cn",
    assessmentType: "FT",
    title: "CN FT-2",
    date: addDays(today, 3),
    startTime: 600,
    duration: 60,
    room: "LH819",
    maximumMarks: 50,
    weightage: 10,
    syllabus: "Unit 2",
    targetMark: 45,
    actualMark: -1,
    notes: "",
    status: "Upcoming",
    taskId: null,
  });
  for (const id of ["t0", "t1", "t2", "t3"])
    await engine.save("assessmentTopics", {
      id: `link-${id}`,
      assessmentId: "ft2",
      topicId: id,
    });
  let data = await repo.read();
  let prep = assessmentPreparation(data, data.assessments[0]!);
  assert.equal(prep.progress, 0);
  assert.equal(prep.minutesRemaining, 120);
  await engine.setTopicState("t0", "Practised");
  await engine.setTopicState("t1", "Mastered");
  data = await repo.read();
  prep = assessmentPreparation(data, data.assessments[0]!);
  assert.equal(prep.progress, 50);
  assert.equal(prep.minutesRemaining, 60);
  // The exam itself is a fixed calendar block, not schedulable study.
  const block = data.blocks.find((b) => b.id === "assessment-ft2");
  assert.equal(block?.date, addDays(today, 3));
  assert.equal(block?.kind, "exam");
  // Planning revision turns what is left into real scheduled work.
  const created = await engine.planExamRevision("ft2");
  assert.equal(created, 2);
  data = await repo.read();
  assert.equal(data.studySessions.length, 2);
  assert.equal(
    data.tasks.filter((t) => t.subcategory === "Study").length,
    2,
  );
  // Planning again adds nothing rather than stacking duplicates.
  assert.equal(await engine.planExamRevision("ft2"), 0);
  assert.equal((await repo.read()).studySessions.length, 2);
  db.close();
});
test("Syllabus progress separates class coverage from personal study", async () => {
  const { db, repo, engine } = await academic();
  await withSyllabus(engine, repo);
  await engine.setTopicState("t0", "Understood");
  await engine.setTopicState("t1", "Practised");
  await engine.reviseTopic("t1");
  const data = await repo.read();
  const topics = data.syllabusTopics.filter((t) => t.subjectId === "cn");
  const p = syllabusProgress(topics);
  assert.equal(p.total, 4);
  assert.equal(p.covered, 100);
  assert.equal(p.studied, 50);
  assert.equal(p.revised, 25);
  const revised = data.syllabusTopics.find((t) => t.id === "t1")!;
  assert.equal(revised.revisionCount, 1);
  assert.equal(revised.state, "Revised");
  assert.ok(revised.nextRevision > dateKey());
  db.close();
});
test("College free periods feed the free-time engine, and the policy is respected", async () => {
  const { db, repo, engine } = await academic();
  const data = await repo.read();
  // Day Order 4 has a clear hour between 10:35 and 11:35.
  const gap = availability(data, DAY[4]).find(
    (s) => s.start >= 635 && s.end <= 695,
  );
  assert.ok(gap, "the gap between classes should be usable free time");
  await engine.settings({ ...data.settings, freePeriods: "Off" });
  const guarded = await repo.read();
  assert.equal(
    availability(guarded, DAY[4]).some((s) => s.start >= 635 && s.end <= 695),
    false,
  );
  db.close();
});
test("A cancelled class gives its time back", async () => {
  const { db, repo, engine } = await academic();
  const before = await repo.read();
  const freeBefore = availability(before, DAY[4]).reduce(
    (n, s) => n + s.end - s.start,
    0,
  );
  await engine.saveClassChange({
    id: "c1",
    date: DAY[4],
    position: 0,
    subjectId: "flat",
    slotCode: "D",
    status: "Cancelled",
    start: 0,
    end: 0,
    room: "",
    faculty: "",
    note: "Faculty away",
  });
  const after = await repo.read();
  assert.equal(activeClasses(after, DAY[4]).length, 2);
  assert.ok(
    availability(after, DAY[4]).reduce((n, s) => n + s.end - s.start, 0) >
      freeBefore,
  );
  db.close();
});
test("Attendance counts hours, and cancelled classes are not held against you", async () => {
  const { db, repo, engine } = await academic();
  const day1 = pastDay(await repo.read(), 1);
  const day3 = pastDay(await repo.read(), 3);
  // Day Order 1 gives Computer Networks a two-hour lab and a two-hour theory block.
  await engine.markAttendance(day1, "cn", [1, 2], "Present");
  await engine.markAttendance(day1, "cn", [6, 7], "Absent");
  let data = await repo.read();
  let a = subjectAttendance(data, "cn");
  assert.equal(a.held, 4);
  assert.equal(a.attended, 2);
  assert.equal(a.percentage, 50);
  // A cancelled class is recorded, but never counted as held.
  await engine.saveClassChange({
    id: "c2",
    date: day3,
    position: 0,
    subjectId: "cn",
    slotCode: "A",
    status: "Cancelled",
    start: 0,
    end: 0,
    room: "",
    faculty: "",
    note: "",
  });
  data = await repo.read();
  a = subjectAttendance(data, "cn");
  assert.equal(a.held, 4);
  assert.equal(a.cancelled, 1);
  assert.equal(a.percentage, 50);
  db.close();
});
test("Attendance forecast arithmetic is exact at the threshold", () => {
  const rows = (present: number, absent: number) => [
    ...Array.from({ length: present }, (_, i) => ({
      id: `p${i}`,
      subjectId: "s",
      date: "2026-09-01",
      position: i,
      state: "Present" as const,
      note: "",
    })),
    ...Array.from({ length: absent }, (_, i) => ({
      id: `a${i}`,
      subjectId: "s",
      date: "2026-09-02",
      position: i,
      state: "Absent" as const,
      note: "",
    })),
  ];
  const a = attendanceStats(rows(28, 4), 75);
  assert.equal(a.held, 32);
  assert.equal(a.percentage, 87.5);
  // 28 attended stays at or above 75% up to 37 held, so five more may be missed.
  assert.equal(a.canMiss, 5);
  assert.equal(a.mustAttend, 0);
  assert.equal(a.atRisk, false);
  const low = attendanceStats(rows(14, 6), 75);
  assert.equal(low.percentage, 70);
  assert.equal(low.atRisk, true);
  assert.equal(low.mustAttend, 4);
  assert.equal(low.ifAttendNext(4), 75);
  assert.equal(low.canMiss, 0);
});
test("Day Order, timetable and academic records survive a restart", async () => {
  const dir = mkdtempSync(join(tmpdir(), "lifeos-academic-"));
  const file = join(dir, "lifeos.db");
  let db = new DatabaseSync(file);
  let repo = new Repository(adapter(db));
  await repo.migrate();
  await seed(repo);
  let engine = new LifeEngine(repo);
  await engine.setDayOrder(DAY[2], 4, "Manual Override", "Announced");
  await engine.markAttendance(
    pastDay(await repo.read(), 1),
    "cn",
    [1, 2],
    "Present",
  );
  const orderBefore = dayOrder(
    DAY[2],
    (await repo.read()).calendar,
    (await repo.read()).settings,
  ).order;
  db.close();
  db = new DatabaseSync(file);
  repo = new Repository(adapter(db));
  await repo.migrate();
  engine = new LifeEngine(repo);
  const data = await repo.read();
  assert.equal(data.subjects.length, 8);
  assert.equal(data.periods.length, 12);
  assert.equal(dayOrder(DAY[2], data.calendar, data.settings).order, orderBefore);
  assert.equal(subjectAttendance(data, "cn").attended, 2);
  assert.deepEqual(shape(data, DAY[1]).length, 5);
  db.close();
  rmSync(dir, { recursive: true });
});
test("Re-running the setup repairs it without duplicating anything", async () => {
  const { db, repo, engine } = await academic();
  const before = await repo.read();
  await engine.restoreAcademicSetup();
  await seed(repo);
  const after = await repo.read();
  assert.equal(after.subjects.length, before.subjects.length);
  assert.equal(after.periods.length, before.periods.length);
  assert.equal(after.courseSlots.length, before.courseSlots.length);
  assert.equal(after.dayOrderSlots.length, before.dayOrderSlots.length);
  assert.equal(after.syllabusUnits.length, before.syllabusUnits.length);
  assert.equal(classesOn(after, DAY[1]).length, 5);
  db.close();
});
test("Upgrading a version 1 database keeps its records and adopts the new schema", async () => {
  const db = new DatabaseSync(":memory:");
  const repo = new Repository(adapter(db));
  db.exec(
    "PRAGMA foreign_keys=ON; CREATE TABLE IF NOT EXISTS schema_migrations(version INTEGER PRIMARY KEY);",
  );
  db.exec(migrations[0]!);
  db.prepare("INSERT INTO schema_migrations VALUES (1)").run();
  db.prepare(
    "INSERT INTO subjects (id,title,code,attended,total,marks,notes) VALUES (?,?,?,?,?,?,?)",
  ).run("subject-0", "Computer Networks", "CN", 12, 16, "FT1 18/20", "keep me");
  db.prepare("INSERT INTO calendar (date,type,dayOrder,note) VALUES (?,?,?,?)").run(
    "2026-09-09",
    "Holiday",
    null,
    "Festival",
  );
  db.prepare("INSERT INTO calendar (date,type,dayOrder,note) VALUES (?,?,?,?)").run(
    "2026-09-08",
    "Manual Override",
    4,
    "",
  );
  db.prepare(
    "INSERT INTO classes (id,dayOrder,subjectId,start,end,room) VALUES (?,?,?,?,?,?)",
  ).run("c1", 1, "subject-0", 480, 530, "B-201");
  db.prepare(
    "INSERT INTO tasks (id,title,lifeArea,subjectId,estimatedDuration,createdAt) VALUES (?,?,?,?,?,?)",
  ).run("t1", "Revise", "academic", "subject-0", 30, new Date().toISOString());
  await repo.migrate();
  const data = await repo.read();
  assert.equal(data.subjects[0]?.title, "Computer Networks");
  assert.equal(data.subjects[0]?.notes, "keep me");
  assert.equal(data.tasks[0]?.subjectId, "subject-0");
  // The working flag is derived from whatever day type the old row carried.
  assert.equal(data.calendar.find((c) => c.date === "2026-09-09")?.working, 0);
  assert.equal(data.calendar.find((c) => c.date === "2026-09-08")?.working, 1);
  assert.equal(dayOrder("2026-09-09", data.calendar, data.settings).order, null);
  assert.equal(dayOrder("2026-09-08", data.calendar, data.settings).order, 4);
  // The denormalised timetable table is gone; the grid resolves classes now.
  assert.equal(
    db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='classes'")
      .all().length,
    0,
  );
  // Installing the semester on top of an upgraded database still works.
  await seed(repo);
  const after = await repo.read();
  assert.equal(after.periods.length, 12);
  assert.equal(after.subjects.length, 9);
  assert.equal(classesOn(after, DAY[1]).length, 5);
  db.close();
});
test("A backup written by the previous version still restores", async () => {
  const { db, repo } = await academic();
  const current = JSON.parse(exportBackup(await repo.read()));
  // What the old build would have written: version 1, none of the academic tables.
  const old: any = { format: "lifeos", version: 1, data: { settings: current.data.settings } };
  for (const table of ["subjects", "skills", "projects", "habits", "tasks", "blocks", "calendar", "topics", "habitLogs", "sessions", "meals", "workouts", "exercises", "workoutLogs", "bodyMetrics", "dependencies"])
    old.data[table] = current.data[table];
  old.data.classes = [{ id: "c1", dayOrder: 1, subjectId: "cn", start: 480, end: 530, room: "B-201" }];
  await importBackup(repo, JSON.stringify(old));
  const data = await repo.read();
  assert.equal(data.subjects.length, 8);
  assert.equal(data.periods.length, 0);
  assert.deepEqual(classesOn(data, DAY[1]), []);
  await assert.rejects(() =>
    importBackup(repo, JSON.stringify({ ...old, version: 3 })),
  );
  db.close();
});
test("The widget snapshot carries today's real academic picture", async () => {
  const { db, repo, engine } = await academic();
  const today = dateKey();
  await engine.setDayOrder(today, 1, "Manual Override", "");
  await engine.saveAssignment({
    id: "a1",
    subjectId: "gpu",
    title: "GPU assignment 2",
    description: "",
    assignedDate: today,
    dueDate: addDays(today, 1),
    dueTime: "23:59",
    estimatedDuration: 60,
    priority: 3,
    maximumMarks: 0,
    awardedMarks: -1,
    submissionType: "",
    submissionLocation: "",
    status: "Not started",
    progress: 60,
    attachments: "",
    notes: "",
    facultyInstructions: "",
    submittedAt: "",
    submissionConfirmed: 0,
    taskId: null,
  });
  const data = await repo.read();
  const snap = widgetSnapshot(data, today, 0);
  assert.equal(snap.dayOrder, 1);
  assert.equal(snap.classes.length, 5);
  assert.equal(snap.nextClass?.short, "CN");
  assert.equal(snap.nextClass?.room, "TP013");
  assert.equal(snap.deadlines[0]?.title, "GPU assignment 2");
  assert.equal(snap.deadlines[0]?.days, 1);
  assert.ok(snap.tomorrow.date === addDays(today, 1));
  assert.ok(snap.remainingByArea);
  assert.equal(typeof snap.remainingByArea.academic, "number");
  assert.equal(typeof snap.remainingByArea.total, "number");
  assert.ok(snap.habitSummary);
  assert.equal(snap.habitSummary.total, 0);
  assert.ok(Array.isArray(snap.projectProgress));
  assert.ok(snap.reminders);
  db.close();
});
test("An announcement applies its change only when asked", async () => {
  const { db, repo, engine } = await academic();
  await engine.save("announcements", {
    id: "n1",
    date: DAY[2],
    scope: "Timetable",
    subjectId: null,
    title: "Tomorrow follows Day Order 4",
    body: "",
    actionType: "Day order",
    actionValue: `${DAY[2]}|4`,
    actionStatus: "None",
    pinned: 0,
    read: 0,
    archived: 0,
    remindAt: "",
    createdAt: new Date().toISOString(),
  });
  let data = await repo.read();
  // Nothing changes until it is applied.
  assert.equal(dayOrder(DAY[2], data.calendar, data.settings).order, 2);
  await engine.applyAnnouncement("n1");
  data = await repo.read();
  assert.equal(dayOrder(DAY[2], data.calendar, data.settings).order, 4);
  assert.equal(data.announcements[0]?.actionStatus, "Applied");
  await assert.rejects(() => engine.applyAnnouncement("missing"));
  db.close();
});
test("A subject todo can become schedulable work and back again", async () => {
  const { db, repo, engine } = await academic();
  const todo = {
    id: "td1",
    subjectId: "cn",
    title: "Print the lab record",
    done: 0,
    taskId: null,
    createdAt: new Date().toISOString(),
    notes: "",
  };
  await engine.saveTodo(todo, true);
  let data = await repo.read();
  assert.equal(data.subjectTodos[0]?.taskId, "todo-td1");
  assert.ok(data.tasks.find((t) => t.id === "todo-td1"));
  await engine.finish("todo-td1", "Completed", 10, 100);
  data = await repo.read();
  assert.equal(data.subjectTodos[0]?.done, 1);
  await engine.saveTodo({ ...data.subjectTodos[0]!, done: 0 }, false);
  data = await repo.read();
  assert.equal(data.subjectTodos[0]?.taskId, null);
  assert.equal(data.tasks.filter((t) => t.id === "todo-td1").length, 0);
  db.close();
});
test("Study suggestions explain themselves and respect the time available", async () => {
  const { db, repo, engine } = await academic();
  const today = dateKey();
  await withSyllabus(engine, repo);
  await engine.save("syllabusTopics", {
    ...(await repo.read()).syllabusTopics.find((t) => t.id === "t2")!,
    teacherImportant: 1,
    pyqCount: 2,
    estimatedMinutes: 35,
  });
  await engine.saveAssessment({
    id: "ft2",
    subjectId: "cn",
    assessmentType: "FT",
    title: "CN FT-2",
    date: addDays(today, 3),
    startTime: 600,
    duration: 60,
    room: "",
    maximumMarks: 50,
    weightage: 0,
    syllabus: "",
    targetMark: 0,
    actualMark: -1,
    notes: "",
    status: "Upcoming",
    taskId: null,
  });
  const data = await repo.read();
  const best = studySuggestions(data, today, 45)[0]!;
  assert.equal(best.title, "VLSM");
  assert.ok(best.reason.includes("CN FT-2 in 3 days"));
  assert.ok(best.reason.includes("Marked important in class"));
  assert.equal(best.minutes, 35);
  // A 20-minute window will not propose a 35-minute topic.
  assert.equal(
    studySuggestions(data, today, 20).some((x) => x.topicId === "t2"),
    false,
  );
  db.close();
});
test("Generating a plan schedules academic work and leaves classes alone", async () => {
  const { db, repo, engine } = await academic();
  const today = dateKey();
  await engine.setDayOrder(today, 4, "Manual Override", "");
  await engine.saveAssignment({
    id: "a1",
    subjectId: "dm",
    title: "Posets problem set",
    description: "",
    assignedDate: today,
    dueDate: addDays(today, 1),
    dueTime: "23:59",
    estimatedDuration: 60,
    priority: 3,
    maximumMarks: 0,
    awardedMarks: -1,
    submissionType: "",
    submissionLocation: "",
    status: "Not started",
    progress: 0,
    attachments: "",
    notes: "",
    facultyInstructions: "",
    submittedAt: "",
    submissionConfirmed: 0,
    taskId: null,
  });
  await engine.generate(today);
  const data = await repo.read();
  const planned = data.blocks.filter(
    (b) => b.date === today && b.kind === "session",
  );
  const classes = activeClasses(data, today);
  for (const block of planned)
    for (const c of classes)
      assert.ok(
        block.end <= c.start || block.start >= c.end,
        "planned work must never land on top of a class",
      );
  // Running it again does not stack duplicate blocks on the same task.
  await engine.generate(today);
  const again = (await repo.read()).blocks.filter(
    (b) => b.date === today && b.kind === "session" && b.taskId === "assignment-a1",
  );
  assert.ok(
    again.reduce((n, b) => n + b.end - b.start, 0) <= 60,
    "no more than the remaining work should ever be reserved",
  );
  db.close();
});

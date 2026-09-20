import { Repository, Table } from "../data/repository";
import {
  AttendanceState,
  Data,
  Task,
  Settings,
  TopicState,
} from "../domain/types";
import { newTask, seedAcademic } from "../data/seed";
import { schedule, nextSlot } from "../domain/scheduling";
import { addDays, dateKey, nowMinute, uid, validDate } from "../domain/time";
import { activeClasses, classesOn } from "../domain/timetable";
import { assessmentPreparation, practised } from "../domain/academic";
import { nextRevisionDate } from "../domain/study";
import { widgetSnapshot } from "./widget";
export class LifeEngine {
  constructor(public repo: Repository) {}
  async startFocus(taskId: string) {
    const data = await this.repo.read(),
      task = data.tasks.find((t) => t.id === taskId);
    if (!task || ["Completed", "Cancelled"].includes(task.status))
      throw new Error("Choose an unfinished task.");
    if (data.tasks.some((t) => t.id !== taskId && t.status === "In Progress"))
      throw new Error("Finish your other focus session first.");
    const start = Date.now(),
      minute = nowMinute(),
      planned = Math.min(
        data.settings.focusDuration,
        Math.ceil(task.estimatedDuration * (1 - task.progress / 100)),
        1440 - minute,
      );
    if (planned <= 0) throw new Error("This task has no work remaining.");
    const value = { start, planned };
    await this.repo.db.withTransactionAsync(async () => {
      await this.repo.db.runAsync(
        "INSERT INTO settings VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
        `focus-${taskId}`,
        JSON.stringify(value),
      );
      await this.repo.upsert("tasks", { ...task, status: "In Progress" });
      await this.repo.db.runAsync(
        "DELETE FROM blocks WHERE taskId=? AND kind='session' AND status='Scheduled'",
        taskId,
      );
      await this.repo.upsert("blocks", {
        id: `focus-${taskId}-${start}`,
        date: dateKey(),
        start: minute,
        end: minute + planned,
        title: task.title,
        kind: "session",
        taskId,
        status: "In Progress",
      });
    });
    return value;
  }
  async rollover(date = dateKey(), minute = nowMinute()) {
    await this.repo.db.runAsync(
      "UPDATE blocks SET status='Missed' WHERE kind='session' AND status='Scheduled' AND (date<? OR (date=? AND end<=?))",
      date,
      date,
      minute,
    );
    await this.repo.db.runAsync(
      "UPDATE tasks SET status='Not Started', scheduledAt=NULL WHERE status='Skipped' AND scheduledAt IS NOT NULL AND substr(scheduledAt,1,10)<?",
      date,
    );
  }
  async reconcile(previous: Data) {
    const next = await this.repo.read();
    const signature = (d: Data) =>
      JSON.stringify({
        tasks: d.tasks.map((t) => [
          t.id,
          t.title,
          t.lifeArea,
          t.deadline,
          t.estimatedDuration,
          t.priority,
          t.importance,
          t.minimumSessionLength,
          t.splittable,
          t.progress,
          ["Completed", "Cancelled"].includes(t.status) ? t.status : "open",
        ]),
        fixed: d.blocks.filter((b) => b.kind !== "session"),
        calendar: d.calendar,
        periods: d.periods,
        dayOrderSlots: d.dayOrderSlots,
        courseSlots: d.courseSlots,
        classChanges: d.classChanges,
        habits: d.habits,
        settings: [
          d.settings.wake,
          d.settings.sleep,
          d.settings.freePeriods,
          d.settings.commute,
          d.settings.lunch,
          d.settings.dinner,
          d.settings.mealDuration,
          d.settings.buffer,
          d.settings.intensity,
          d.settings.anchorDate,
          d.settings.anchorOrder,
          d.settings.weekends,
          d.settings.workoutTime,
        ],
      });
    if (signature(previous) === signature(next)) return;
    const dates = [
      ...new Set(
        [...previous.blocks, ...next.blocks]
          .filter((b) => b.kind === "session" && b.date >= dateKey())
          .map((b) => b.date),
      ),
    ].sort();
    for (const date of dates) await this.generate(date);
  }
  async snapshot() {
    const data = await this.repo.read();
    const payload = JSON.stringify(widgetSnapshot(data));
    await this.repo.db.runAsync(
      "INSERT INTO widget_snapshots VALUES (?,?,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload,updatedAt=excluded.updatedAt",
      "current",
      payload,
      new Date().toISOString(),
    );
    return data;
  }
  async save(table: Table, row: any) {
    if ("title" in row && !row.title.trim())
      throw new Error("Please add a title.");
    if (table === "tasks") this.validateTask(row);
    if (table === "blocks" || table === "periods") {
      if (
        !Number.isFinite(row.start) ||
        !Number.isFinite(row.end) ||
        row.start < 0 ||
        row.end > 1440 ||
        row.end <= row.start
      )
        throw new Error("End time must be after start time.");
    }
    if (["blocks", "calendar"].includes(table) && !row.date)
      throw new Error("Use a valid date: YYYY-MM-DD.");
    if (
      table === "calendar" &&
      row.dayOrder !== null &&
      (!Number.isInteger(row.dayOrder) || row.dayOrder < 1 || row.dayOrder > 5)
    )
      throw new Error("Day Order must be 1–5.");
    for (const field of [
      "date",
      "dueDate",
      "assignedDate",
      "targetDate",
      "nextRevision",
      "startDate",
      "lastRevised",
      "remindAt",
    ])
      if (row[field] && !validDate(String(row[field]).slice(0, 10)))
        throw new Error("Use a valid date: YYYY-MM-DD.");
    await this.repo.upsert(table, row);
  }
  validateTask(t: Task) {
    if (
      !Number.isFinite(t.estimatedDuration) ||
      t.estimatedDuration <= 0 ||
      !Number.isFinite(t.minimumSessionLength) ||
      t.minimumSessionLength <= 0 ||
      t.minimumSessionLength > t.estimatedDuration
    )
      throw new Error(
        "Duration must be positive, with a minimum session no longer than the task.",
      );
    if (t.deadline && !validDate(t.deadline.slice(0, 10)))
      throw new Error("Use a valid deadline: YYYY-MM-DD.");
    if (t.progress < 0 || t.progress > 100)
      throw new Error("Progress must be between 0 and 100.");
  }
  async settings(s: Settings) {
    if (s.wake >= s.sleep)
      throw new Error("Sleep time must be later than wake time in this MVP.");
    if (!validDate(s.anchorDate)) throw new Error("Use a valid anchor date.");
    if (!Number.isInteger(s.anchorOrder) || s.anchorOrder < 1 || s.anchorOrder > 5)
      throw new Error("The anchor Day Order must be 1–5.");
    if (s.attendanceThreshold < 0 || s.attendanceThreshold > 100)
      throw new Error("Attendance threshold must be between 0 and 100.");
    if (s.buffer < 0 || s.commute < 0 || s.mealDuration <= 0)
      throw new Error("Check buffer, commute and meal duration.");
    await this.repo.settings(s);
  }
  async generate(date = dateKey()) {
    await this.rollover();
    await this.ensureHabits(date);
    const data = await this.repo.read();
    const blocks = schedule(data, date, date === dateKey() ? nowMinute() : 0);
    await this.repo.db.withTransactionAsync(async () => {
      await this.repo.db.runAsync(
        "DELETE FROM blocks WHERE date=? AND kind='session' AND status NOT IN ('Completed','In Progress','Partially Completed','Missed')",
        date,
      );
      for (const b of blocks) {
        await this.repo.upsert("blocks", b);
        await this.repo.db.runAsync(
          "UPDATE tasks SET status='Scheduled',scheduledAt=? WHERE id=?",
          `${date}T${String(Math.floor(b.start / 60)).padStart(2, "0")}:${String(b.start % 60).padStart(2, "0")}`,
          b.taskId,
        );
      }
      await this.repo.db.execAsync(
        "UPDATE tasks SET status='Not Started',scheduledAt=NULL WHERE status='Scheduled' AND id NOT IN (SELECT taskId FROM blocks WHERE status='Scheduled' AND taskId IS NOT NULL)",
      );
    });
    return blocks.length;
  }
  async ensureHabits(date: string) {
    const data = await this.repo.read();
    for (const h of data.habits.filter(
      (h) => h.duration > 0 && h.startDate <= date,
    )) {
      if (
        data.habitLogs.some(
          (l) => l.habitId === h.id && l.date === date && l.value >= h.target,
        )
      )
        continue;
      if (
        data.tasks.some(
          (t) =>
            t.habitId === h.id &&
            !["Completed", "Cancelled", "Skipped"].includes(t.status),
        )
      )
        continue;
      const id = `habit-task-${h.id}-${date}`;
      if (data.tasks.some((t) => t.id === id)) continue;
      await this.repo.upsert("tasks", {
        ...newTask(h.title, "habits", id),
        habitId: h.id,
        deadline: date,
        estimatedDuration: h.duration,
        minimumSessionLength: Math.min(15, h.duration),
      });
    }
  }
  async logHabit(habitId: string, value: number, date = dateKey()) {
    if (!Number.isFinite(value) || value < 0)
      throw new Error("Habit value must be zero or more.");
    if (!validDate(date) || date > dateKey())
      throw new Error("Use today or a valid past date for a check-in.");
    await this.repo.upsert("habitLogs", {
      id: `${habitId}-${date}`,
      habitId,
      date,
      value,
    });
  }
  async finish(
    taskId: string,
    outcome: string,
    actual: number,
    progress: number,
    notes = "",
    planned = 0,
    startedAt = new Date().toISOString(),
  ) {
    if (!Number.isFinite(actual) || actual < 0 || actual > 1440)
      throw new Error("Actual time must be 0–1440 minutes.");
    if (!Number.isFinite(progress) || progress < 0 || progress > 100)
      throw new Error("Progress must be 0–100.");
    const data = await this.repo.read(),
      task = data.tasks.find((t) => t.id === taskId);
    if (!task) throw new Error("Task no longer exists.");
    if (task.status === "Completed")
      throw new Error("This task is already complete.");
    const today = dateKey(),
      complete = outcome === "Completed";
    const plannedBlock = data.blocks
      .filter(
        (b) =>
          b.taskId === taskId &&
          b.kind === "session" &&
          ["Scheduled", "In Progress"].includes(b.status),
      )
      .sort((a, b) => a.date.localeCompare(b.date) || a.start - b.start)[0];
    await this.repo.db.withTransactionAsync(async () => {
      await this.repo.db.runAsync(
        "DELETE FROM settings WHERE key=?",
        `focus-${taskId}`,
      );
      await this.repo.upsert("sessions", {
        id: uid(),
        taskId,
        date: today,
        startedAt,
        planned:
          planned ||
          (plannedBlock
            ? plannedBlock.end - plannedBlock.start
            : task.estimatedDuration),
        actual,
        outcome,
        notes,
      });
      await this.repo.upsert("tasks", {
        ...task,
        actualDuration: task.actualDuration + actual,
        progress: complete ? 100 : progress,
        status: complete
          ? "Completed"
          : actual > 0
            ? "Partially Completed"
            : "Not Started",
        completedAt: complete ? new Date().toISOString() : null,
        scheduledAt: null,
        notes: notes || task.notes,
      });
      const next = data.blocks
        .filter(
          (b) =>
            b.taskId === taskId &&
            b.kind === "session" &&
            ["Scheduled", "In Progress"].includes(b.status),
        )
        .sort((a, b) => a.date.localeCompare(b.date) || a.start - b.start)[0];
      if (next)
        await this.repo.upsert("blocks", {
          ...next,
          status: complete
            ? "Completed"
            : actual > 0
              ? "Partially Completed"
              : "Skipped",
        });
      await this.repo.db.runAsync(
        "DELETE FROM blocks WHERE taskId=? AND kind='session' AND status='Scheduled'",
        taskId,
      );
      if (task.habitId) {
        const h = data.habits.find((h) => h.id === task.habitId);
        if (h && (h.type === "duration" || h.type === "boolean")) {
          const current =
            data.habitLogs.find((l) => l.habitId === h.id && l.date === today)
              ?.value ?? 0;
          await this.logHabit(
            h.id,
            h.type === "boolean" ? (complete ? 1 : current) : current + actual,
            today,
          );
        }
      }
      const assignment = data.assignments.find((a) => a.taskId === taskId);
      if (assignment) {
        const next = complete ? 100 : Math.max(assignment.progress, progress);
        await this.repo.upsert("assignments", {
          ...assignment,
          progress: next,
          // Finishing the work is not the same as having submitted it.
          status: complete
            ? assignment.submissionConfirmed
              ? "Submitted"
              : "Ready to submit"
            : next > 0
              ? "In progress"
              : assignment.status,
        });
      }
      for (const session of data.studySessions.filter(
        (s) => s.taskId === taskId && s.status !== "Done",
      ))
        await this.repo.upsert("studySessions", {
          ...session,
          actualDuration: session.actualDuration + actual,
          status: complete ? "Done" : "In progress",
        });
      for (const todo of data.subjectTodos.filter((t) => t.taskId === taskId))
        if (complete) await this.repo.upsert("subjectTodos", { ...todo, done: 1 });
      if (complete && task.recurrence && !task.parentId) {
        const nextDate = addDays(
          task.deadline ?? today,
          task.recurrence === "weekly" ? 7 : 1,
        );
        await this.repo.upsert("tasks", {
          ...task,
          id: `${task.id}-${nextDate}`,
          parentId: task.id,
          deadline: nextDate,
          progress: 0,
          actualDuration: 0,
          status: "Not Started",
          completedAt: null,
          scheduledAt: null,
          createdAt: new Date().toISOString(),
        });
      }
      if (complete && task.parentId && task.recurrence) {
        const nextDate = addDays(
          task.deadline ?? today,
          task.recurrence === "weekly" ? 7 : 1,
        );
        await this.repo.upsert("tasks", {
          ...task,
          id: `${task.parentId}-${nextDate}`,
          deadline: nextDate,
          progress: 0,
          actualDuration: 0,
          status: "Not Started",
          completedAt: null,
          scheduledAt: null,
          createdAt: new Date().toISOString(),
        });
      }
    });
  }
  async reschedule(taskId: string, mode: string) {
    const data = await this.repo.read(),
      task = data.tasks.find((t) => t.id === taskId);
    if (!task) throw new Error("Task no longer exists.");
    if (task.status === "In Progress")
      throw new Error("Finish your focus session before moving the task.");
    if (task.status === "Completed" || task.status === "Cancelled")
      throw new Error("Reopen the task before rescheduling it.");
    if (task.fixed) throw new Error("Edit this fixed appointment in Calendar.");
    const date = mode === "Tomorrow" ? addDays(dateKey(), 1) : dateKey();
    const found = ["Keep unscheduled", "Skip today"].includes(mode)
      ? null
      : nextSlot(data, taskId, date, date === dateKey() ? nowMinute() : 0);
    if (!found && !["Keep unscheduled", "Skip today"].includes(mode))
      throw new Error(
        "No fitting slot in the next 14 days. Try splitting the task.",
      );
    if (mode === "Later today" && found?.date !== date)
      throw new Error("No fitting slot left today. Try tomorrow.");
    await this.repo.db.withTransactionAsync(async () => {
      await this.repo.db.runAsync(
        "UPDATE blocks SET status='Skipped' WHERE taskId=? AND kind='session' AND status='Scheduled'",
        taskId,
      );
      if (found)
        await this.repo.upsert("blocks", {
          id: uid(),
          date: found.date,
          ...found.slot,
          title: task.title,
          kind: "session",
          taskId,
          status: "Scheduled",
        });
      await this.repo.upsert("tasks", {
        ...task,
        status: found
          ? "Scheduled"
          : mode === "Skip today"
            ? "Skipped"
            : "Not Started",
        scheduledAt: found
          ? `${found.date}T${String(Math.floor(found.slot.start / 60)).padStart(2, "0")}:${String(found.slot.start % 60).padStart(2, "0")}`
          : mode === "Skip today"
            ? `${dateKey()}T00:00`
            : null,
      });
    });
    return found;
  }
  /** Re-applies the verified semester setup without touching personal records. */
  async restoreAcademicSetup() {
    await seedAcademic(this.repo);
  }
  /**
   * An academic record and its master task are one thing seen from two sides: saving either
   * keeps the other in step, so an assignment never has to be entered twice.
   */
  async saveAssignment(row: any) {
    if (!row.subjectId) throw new Error("Choose a subject for this assignment.");
    const taskId = `assignment-${row.id}`;
    const data = await this.repo.read();
    const existing = data.tasks.find((t) => t.id === taskId);
    const submitted = ["Submitted", "Graded"].includes(row.status);
    const duration = Number(row.estimatedDuration);
    await this.repo.db.withTransactionAsync(async () => {
      // The task has to exist before the assignment can point at it.
      await this.save("tasks", {
        ...(existing ?? newTask(row.title, "academic", taskId)),
        title: row.title,
        description: row.description ?? "",
        lifeArea: "academic",
        subcategory: "Assignment",
        subjectId: row.subjectId,
        deadline: row.dueDate,
        estimatedDuration: duration,
        priority: Number(row.priority) || 2,
        minimumSessionLength: Math.min(
          existing?.minimumSessionLength ?? 20,
          duration,
        ),
        progress: Number(row.progress) || 0,
        status: submitted
          ? "Completed"
          : existing && !["Completed", "Cancelled"].includes(existing.status)
            ? existing.status
            : "Not Started",
        completedAt: submitted
          ? (existing?.completedAt ?? new Date().toISOString())
          : null,
      });
      await this.save("assignments", {
        ...row,
        estimatedDuration: duration,
        taskId,
      });
    });
  }
  async confirmSubmission(id: string, confirmed: boolean) {
    const data = await this.repo.read(),
      assignment = data.assignments.find((a) => a.id === id);
    if (!assignment) throw new Error("This assignment no longer exists.");
    await this.repo.upsert("assignments", {
      ...assignment,
      submissionConfirmed: confirmed ? 1 : 0,
      submittedAt: confirmed ? new Date().toISOString() : "",
      status: confirmed
        ? "Submitted"
        : assignment.progress >= 100
          ? "Ready to submit"
          : assignment.status,
    });
  }
  async saveAssessment(row: any) {
    if (!row.subjectId) throw new Error("Choose a subject for this assessment.");
    const duration = Number(row.duration),
      start = Number(row.startTime);
    if (!Number.isFinite(duration) || duration <= 0)
      throw new Error("Give the assessment a positive duration.");
    if (start < 0 || start + duration > 1440)
      throw new Error("The assessment does not fit inside the day.");
    const taskId = `assessment-${row.id}`;
    const data = await this.repo.read();
    const existing = data.tasks.find((t) => t.id === taskId);
    await this.repo.db.withTransactionAsync(async () => {
      await this.save("tasks", {
        ...(existing ?? newTask(row.title, "academic", taskId)),
        title: row.title,
        lifeArea: "academic",
        subcategory: "Exam",
        subjectId: row.subjectId,
        deadline: row.date,
        estimatedDuration: duration,
        minimumSessionLength: Math.min(15, duration),
        splittable: 0,
        fixed: 1,
      });
      await this.save("assessments", {
        ...row,
        duration,
        startTime: start,
        taskId,
      });
      await this.save("blocks", {
        id: taskId,
        date: row.date,
        start,
        end: start + duration,
        title: row.title,
        kind: "exam",
        taskId,
        status: "Scheduled",
      });
    });
  }
  /** Turns the topics still left for an exam into scheduled study work. */
  async planExamRevision(assessmentId: string) {
    const data = await this.repo.read(),
      assessment = data.assessments.find((a) => a.id === assessmentId);
    if (!assessment) throw new Error("This assessment no longer exists.");
    const prep = assessmentPreparation(data, assessment);
    if (!prep.topics.length)
      throw new Error("Link the syllabus topics for this assessment first.");
    if (!prep.remaining.length)
      throw new Error("Every linked topic is already practised. Nothing left to plan.");
    const today = dateKey();
    const due = [addDays(assessment.date, -1), today].sort().reverse()[0]!;
    let created = 0;
    await this.repo.db.withTransactionAsync(async () => {
      for (const topic of prep.remaining) {
        const id = `study-${assessmentId}-${topic.id}`;
        if (data.studySessions.some((s) => s.id === id)) continue;
        const taskId = `task-${id}`;
        const minutes = topic.estimatedMinutes || 30;
        await this.save("tasks", {
          ...newTask(`${topic.title} · ${assessment.title}`, "academic", taskId),
          subjectId: assessment.subjectId,
          subcategory: "Study",
          deadline: due,
          estimatedDuration: minutes,
          minimumSessionLength: Math.min(20, minutes),
          importance: 4,
          priority: 3,
        });
        await this.save("studySessions", {
          id,
          subjectId: assessment.subjectId,
          topicId: topic.id,
          date: due,
          startTime: 0,
          plannedDuration: minutes,
          actualDuration: 0,
          sessionType: practised(topic) ? "Revision" : "Learn",
          status: "Planned",
          focusScore: 0,
          notes: "",
          taskId,
        });
        created++;
      }
    });
    return created;
  }
  /** A subject todo can stay a note, or become real scheduled work. */
  async saveTodo(row: any, scheduleIt: boolean) {
    const data = await this.repo.read();
    const taskId = row.taskId ?? `todo-${row.id}`;
    await this.repo.db.withTransactionAsync(async () => {
      if (scheduleIt) {
        const existing = data.tasks.find((t) => t.id === taskId);
        await this.save("tasks", {
          ...(existing ?? newTask(row.title, "academic", taskId)),
          title: row.title,
          lifeArea: "academic",
          subcategory: "Study",
          subjectId: row.subjectId,
          estimatedDuration:
            existing?.estimatedDuration ?? data.settings.defaultDuration,
          status: row.done ? "Completed" : (existing?.status ?? "Not Started"),
          progress: row.done ? 100 : (existing?.progress ?? 0),
        });
      } else if (row.taskId) await this.repo.remove("tasks", row.taskId);
      await this.save("subjectTodos", {
        ...row,
        taskId: scheduleIt ? taskId : null,
        createdAt: row.createdAt || new Date().toISOString(),
      });
    });
  }
  async markAttendance(
    date: string,
    subjectId: string,
    positions: number[],
    state: AttendanceState,
  ) {
    if (!validDate(date)) throw new Error("Use a valid date: YYYY-MM-DD.");
    if (date > dateKey())
      throw new Error("Attendance can only be recorded up to today.");
    await this.repo.db.withTransactionAsync(async () => {
      for (const position of positions)
        await this.repo.upsert("attendance", {
          id: `att-${subjectId}-${date}-${position}`,
          subjectId,
          date,
          position,
          state,
          note: "",
        });
    });
  }
  /** Every class of the day at once, then correct the exceptions. */
  async markDayAttendance(date: string, state: AttendanceState) {
    const data = await this.repo.read();
    let marked = 0;
    for (const instance of activeClasses(data, date)) {
      if (!instance.subjectId) continue;
      await this.markAttendance(
        date,
        instance.subjectId,
        instance.positions,
        state,
      );
      marked++;
    }
    return marked;
  }
  async saveClassChange(row: any) {
    if (!validDate(row.date)) throw new Error("Use a valid date: YYYY-MM-DD.");
    if (
      ["Time changed", "Extra class", "Replacement"].includes(row.status) &&
      (!Number.isFinite(row.start) ||
        !Number.isFinite(row.end) ||
        row.end <= row.start)
    )
      throw new Error("End time must be after start time.");
    await this.repo.db.withTransactionAsync(async () => {
      await this.repo.upsert("classChanges", row);
      // A cancelled class was never held, so it must not count against attendance.
      if (row.status === "Cancelled" && row.subjectId) {
        const data = await this.repo.read();
        const instance = classesOn(data, row.date).find(
          (c) => c.subjectId === row.subjectId,
        );
        for (const position of instance?.positions ?? [])
          await this.repo.upsert("attendance", {
            id: `att-${row.subjectId}-${row.date}-${position}`,
            subjectId: row.subjectId,
            date: row.date,
            position,
            state: "Cancelled",
            note: row.note ?? "",
          });
      }
    });
  }
  async setDayOrder(date: string, order: number | null, type: string, note = "") {
    if (!validDate(date)) throw new Error("Use a valid date: YYYY-MM-DD.");
    const working = [
      "Academic Day",
      "Manual Override",
      "Special Timetable",
      "Special Working Day",
    ].includes(type);
    if (working && !order)
      throw new Error("Choose the Day Order this date should follow.");
    await this.save("calendar", {
      date,
      type,
      dayOrder: working ? order : null,
      note,
      eventTitle: "",
      working: working ? 1 : 0,
      source: "Manual",
    });
  }
  /** Announcements can carry an action; it is always applied explicitly, never silently. */
  async applyAnnouncement(id: string) {
    const data = await this.repo.read(),
      a = data.announcements.find((x) => x.id === id);
    if (!a) throw new Error("This announcement no longer exists.");
    if (!a.actionType || a.actionType === "None")
      throw new Error("This announcement has no action attached.");
    const [first, second] = a.actionValue.split("|");
    if (a.actionType === "Day order") {
      const order = Number(second ?? "");
      if (!first || !Number.isInteger(order))
        throw new Error("Set the date and Day Order on this announcement first.");
      await this.setDayOrder(first, order, "Manual Override", a.title);
    } else if (a.actionType === "Move deadline") {
      const assignment = data.assignments.find((x) => x.id === first);
      if (!assignment || !second || !validDate(second))
        throw new Error("Choose the assignment and its new due date.");
      await this.saveAssignment({ ...assignment, dueDate: second });
    } else if (a.actionType === "Cancel class") {
      if (!a.subjectId || !first)
        throw new Error("Choose the subject and date for the cancelled class.");
      await this.saveClassChange({
        id: `cancel-${a.id}`,
        date: first,
        position: 0,
        subjectId: a.subjectId,
        slotCode: "",
        status: "Cancelled",
        start: 0,
        end: 0,
        room: "",
        faculty: "",
        note: a.title,
      });
    } else if (a.actionType === "Update exam syllabus") {
      const assessment = data.assessments.find((x) => x.id === first);
      if (!assessment) throw new Error("Choose the assessment to update.");
      await this.repo.upsert("assessments", {
        ...assessment,
        syllabus: second ?? assessment.syllabus,
      });
    }
    await this.repo.upsert("announcements", {
      ...a,
      actionStatus: "Applied",
      read: 1,
    });
  }
  async logStudy(row: {
    subjectId: string;
    topicId: string | null;
    minutes: number;
    sessionType: string;
    notes?: string;
    date?: string;
  }) {
    const date = row.date ?? dateKey();
    if (!Number.isFinite(row.minutes) || row.minutes <= 0)
      throw new Error("Log a positive number of minutes.");
    await this.repo.db.withTransactionAsync(async () => {
      await this.save("studySessions", {
        id: uid(),
        subjectId: row.subjectId,
        topicId: row.topicId,
        date,
        startTime: nowMinute(),
        plannedDuration: row.minutes,
        actualDuration: row.minutes,
        sessionType: row.sessionType,
        status: "Done",
        focusScore: 0,
        notes: row.notes ?? "",
        taskId: null,
      });
      if (row.topicId && row.sessionType === "Revision")
        await this.reviseTopic(row.topicId, date);
    });
  }
  async reviseTopic(topicId: string, date = dateKey()) {
    const data = await this.repo.read(),
      topic = data.syllabusTopics.find((t) => t.id === topicId);
    if (!topic) throw new Error("This topic no longer exists.");
    const next = { ...topic, revisionCount: topic.revisionCount + 1 };
    await this.repo.upsert("syllabusTopics", {
      ...next,
      lastRevised: date,
      nextRevision: nextRevisionDate(next, date),
      state: practised(topic) ? "Revised" : topic.state,
    });
  }
  async setTopicState(topicId: string, state: TopicState) {
    const data = await this.repo.read(),
      topic = data.syllabusTopics.find((t) => t.id === topicId);
    if (!topic) throw new Error("This topic no longer exists.");
    const rank = ["Not started", "Learning", "Understood", "Practised", "Revised", "Mastered"].indexOf(
      state,
    );
    await this.repo.upsert("syllabusTopics", {
      ...topic,
      state,
      conceptUnderstood: rank >= 2 ? 1 : 0,
      practiceCompleted: rank >= 3 ? 1 : 0,
    });
  }
  async captureInbox(text: string) {
    if (!text.trim()) throw new Error("Write something to capture first.");
    await this.repo.upsert("inbox", {
      id: uid(),
      text: text.trim(),
      createdAt: new Date().toISOString(),
      status: "New",
      note: "",
    });
  }
}

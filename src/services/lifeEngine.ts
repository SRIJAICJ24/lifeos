import { Repository, Table } from "../data/repository";
import { Data, Task, Settings } from "../domain/types";
import { newTask } from "../data/seed";
import { schedule, nextSlot } from "../domain/scheduling";
import { addDays, dateKey, nowMinute, uid, validDate } from "../domain/time";
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
        classes: d.classes,
        habits: d.habits,
        settings: [
          d.settings.wake,
          d.settings.sleep,
          d.settings.collegeStart,
          d.settings.collegeEnd,
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
    if (table === "blocks" || table === "classes") {
      if (
        !Number.isFinite(row.start) ||
        !Number.isFinite(row.end) ||
        row.start < 0 ||
        row.end > 1440 ||
        row.end <= row.start
      )
        throw new Error("End time must be after start time.");
    }
    if ("date" in row && !validDate(row.date))
      throw new Error("Use a valid date: YYYY-MM-DD.");
    if (
      table === "calendar" &&
      row.dayOrder !== null &&
      (!Number.isInteger(row.dayOrder) || row.dayOrder < 1 || row.dayOrder > 5)
    )
      throw new Error("Day Order must be 1–5.");
    for (const field of ["targetDate", "nextRevision", "startDate"])
      if (row[field] && !validDate(row[field]))
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
    if (s.collegeEnd <= s.collegeStart)
      throw new Error("College end must be later than its start.");
    if (!validDate(s.anchorDate)) throw new Error("Use a valid anchor date.");
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
}

import { Data, Habit } from "./types";
import { addDays, daysBetween } from "./time";
export function habitStats(habit: Habit, data: Data, date: string) {
  const logs = data.habitLogs.filter((l) => l.habitId === habit.id),
    done = new Set(
      logs.filter((l) => l.value >= habit.target).map((l) => l.date),
    );
  let streak = 0;
  let d = done.has(date) ? date : addDays(date, -1);
  while (done.has(d)) {
    streak++;
    d = addDays(d, -1);
  }
  let longest = 0,
    run = 0;
  for (
    let i = 0;
    i <= Math.min(3660, daysBetween(habit.startDate, date));
    i++
  ) {
    run = done.has(addDays(habit.startDate, i)) ? run + 1 : 0;
    longest = Math.max(longest, run);
  }
  const weekly = Array.from({ length: 7 }, (_, i) =>
    done.has(addDays(date, i - 6)),
  );
  return {
    streak,
    longest,
    weekly,
    total: done.size,
    rate: Math.round((weekly.filter(Boolean).length / 7) * 100),
    value: logs.find((l) => l.date === date)?.value ?? 0,
  };
}
export function analytics(data: Data, date: string) {
  const start = addDays(date, -6),
    prev = addDays(date, -13);
  const sessions = data.sessions.filter(
    (s) => s.date >= start && s.date <= date,
  );
  const blocks = data.blocks.filter(
    (b) => b.date >= start && b.date <= date && b.kind === "session",
  );
  const completed = data.tasks.filter(
    (t) =>
      t.completedAt &&
      t.completedAt.slice(0, 10) >= start &&
      t.completedAt.slice(0, 10) <= date,
  ).length;
  const planned = blocks.reduce((n, b) => n + b.end - b.start, 0),
    actual = sessions.reduce((n, s) => n + s.actual, 0);
  const previous = data.sessions
    .filter((s) => s.date >= prev && s.date < start)
    .reduce((n, s) => n + s.actual, 0);
  return {
    completed,
    planned,
    actual,
    previous,
    missed: blocks.filter((b) => b.status !== "Completed" && b.date < date)
      .length,
    completion: blocks.length
      ? Math.round(
          (blocks.filter((b) => b.status === "Completed").length /
            blocks.length) *
            100,
        )
      : 0,
    accuracy: sessions.reduce((n, s) => n + s.planned, 0)
      ? Math.round((actual / sessions.reduce((n, s) => n + s.planned, 0)) * 100)
      : 0,
    byArea: Object.fromEntries(
      ["academic", "skills", "projects", "fitness"].map((area) => [
        area,
        sessions
          .filter(
            (s) => data.tasks.find((t) => t.id === s.taskId)?.lifeArea === area,
          )
          .reduce((n, s) => n + s.actual, 0),
      ]),
    ),
    days: Array.from({ length: 7 }, (_, i) => {
      const d = addDays(date, i - 6);
      return {
        date: d,
        minutes: sessions
          .filter((s) => s.date === d)
          .reduce((n, s) => n + s.actual, 0),
      };
    }),
  };
}

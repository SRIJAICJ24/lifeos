import { Data } from "../domain/types";
import { dayOrder } from "../domain/dayOrder";
import { availability } from "../domain/freeTime";
import { activeClasses, nextClass } from "../domain/timetable";
import { deadlines, displayName } from "../domain/academic";
import { studySuggestions } from "../domain/study";
import { habitStats } from "../domain/analytics";
import { recommendations, actionable } from "../domain/priority";
import { addDays, dateKey, nowMinute, clock, daysBetween } from "../domain/time";
/** One payload feeding every home-screen widget; each widget reads the parts it needs. */
export function widgetSnapshot(
  data: Data,
  date = dateKey(),
  minute = nowMinute(),
) {
  const order = dayOrder(date, data.calendar, data.settings);
  const tomorrow = addDays(date, 1);
  const tomorrowOrder = dayOrder(tomorrow, data.calendar, data.settings);
  const classes = activeClasses(data, date);
  const next = nextClass(data, date, minute);
  const free = availability(data, date, minute)[0];
  const subject = (id: string | null) =>
    displayName(data.subjects.find((s) => s.id === id));
  const study = studySuggestions(
    data,
    date,
    free ? free.end - free.start : 60,
  )[0];
  const active = data.tasks.filter(actionable);

  const plan = data.blocks
    .filter((b) => b.date === date && b.kind === "session")
    .sort((a, b) => a.start - b.start);
  const nextBlock = plan.find(
    (b) => b.start > minute && b.status === "Scheduled",
  );
  const nextBlockTask = nextBlock
    ? data.tasks.find((t) => t.id === nextBlock.taskId)
    : null;

  const habitList = data.habits.map((h) => {
    const stat = habitStats(h, data, date);
    return {
      id: h.id,
      title: h.title,
      target: h.target,
      value: stat.value,
      done: stat.value >= h.target,
      streak: stat.streak,
    };
  });

  return {
    version: 2,
    generatedAt: new Date().toISOString(),
    date,
    dayOrder: order.order,
    dayType: order.type,
    tomorrow: { date: tomorrow, dayOrder: tomorrowOrder.order, type: tomorrowOrder.type },
    nextClass: next
      ? {
          title: next.title,
          short: subject(next.subjectId),
          start: next.start,
          end: next.end,
          room: next.room,
          kind: next.kind,
        }
      : null,
    classes: classes.map((c) => ({
      short: subject(c.subjectId),
      title: c.title,
      start: c.start,
      end: c.end,
      room: c.room,
      kind: c.kind,
    })),
    deadlines: deadlines(data, date)
      .filter((d) => d.days <= 14)
      .slice(0, 5)
      .map((d) => ({
        title: d.title,
        subject: subject(d.subjectId),
        kind: d.kind,
        days: d.days,
        date: d.date,
        progress: Math.round(d.progress),
      })),
    study: study
      ? {
          title: study.title,
          subject: subject(study.subjectId),
          kind: study.kind,
          minutes: study.minutes,
          reason: study.reason,
        }
      : null,
    tasks: active
      .map((t) => ({ id: t.id, title: t.title, deadline: t.deadline }))
      .slice(0, 8),
    freeSlot: free ?? null,
    suggestion: free
      ? (recommendations(data, date, free.end - free.start)[0]?.title ?? null)
      : null,
    nextTask: nextBlockTask
      ? {
          title: nextBlockTask.title,
          area: nextBlockTask.lifeArea,
          start: nextBlock!.start,
          end: nextBlock!.end,
          deadline: nextBlockTask.deadline,
        }
      : null,
    remainingByArea: {
      academic: active.filter((t) => t.lifeArea === "academic").length,
      skills: active.filter((t) => t.lifeArea === "skills").length,
      projects: active.filter((t) => t.lifeArea === "projects").length,
      fitness: active.filter((t) => t.lifeArea === "fitness").length,
      habits: active.filter((t) => t.lifeArea === "habits").length,
      total: active.length,
    },
    projectProgress: data.projects.map((p) => {
      const milestones = data.topics.filter(
        (t) => t.ownerId === p.id && t.ownerType === "project",
      );
      const done = milestones.filter((m) => m.done).length;
      return {
        title: p.title,
        status: p.status,
        done,
        total: milestones.length,
        progress: milestones.length
          ? Math.round((done / milestones.length) * 100)
          : 0,
      };
    }),
    habits: habitList,
    habitSummary: {
      done: habitList.filter((h) => h.done).length,
      total: habitList.length,
    },
    tomorrowTaskCount: data.tasks.filter(
      (t) => actionable(t) && t.deadline === tomorrow,
    ).length,
    reminders: {
      enabled: !!data.settings.notifications,
      tasks: !!data.settings.notifyTasks,
      classes: !!data.settings.notifyClasses,
      exams: !!data.settings.notifyExams,
      dayOrder: !!data.settings.notifyDayOrder,
      weekly: !!data.settings.notifyWeekly,
    },
    weeklySummary: (() => {
      const weekStart = addDays(date, -6);
      const tasksCompleted = data.tasks.filter(
        (t) =>
          t.completedAt &&
          t.completedAt.slice(0, 10) >= weekStart &&
          t.completedAt.slice(0, 10) <= date,
      ).length;
      const habitsRate = data.habits.length
        ? Math.round(
            (data.habits.reduce((sum, h) => {
              const days = Array.from({ length: 7 }, (_, i) => addDays(date, i - 6));
              const done = days.filter((d) =>
                data.habitLogs.some(
                  (l) => l.habitId === h.id && l.date === d && l.value >= h.target,
                ),
              ).length;
              return sum + done;
            }, 0) /
              (data.habits.length * 7)) *
              100,
          )
        : 0;
      const focusMinutes = data.sessions
        .filter((s) => s.date >= weekStart && s.date <= date)
        .reduce((sum, s) => sum + s.actual, 0);
      const topStreak = data.habits.reduce((best, h) => {
        const stat = habitStats(h, data, date);
        return Math.max(best, stat.streak);
      }, 0);
      return { tasksCompleted, habitsRate, focusMinutes, topStreak };
    })(),
    diet: {
      calories: data.meals
        .filter((m) => m.date === date)
        .reduce((n, m) => n + m.calories, 0),
      target: data.settings.calories,
    },
    fitness: data.workouts
      .filter((w) => w.weekday === new Date().getDay())
      .map((w) => ({ title: w.title, duration: w.duration })),
  };
}

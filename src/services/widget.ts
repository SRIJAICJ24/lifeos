import { Data } from "../domain/types";
import { dayOrder } from "../domain/dayOrder";
import { availability } from "../domain/freeTime";
import { activeClasses, nextClass } from "../domain/timetable";
import { deadlines, displayName } from "../domain/academic";
import { studySuggestions } from "../domain/study";
import { habitStats } from "../domain/analytics";
import { recommendations, actionable } from "../domain/priority";
import { addDays, dateKey, nowMinute } from "../domain/time";
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
    tasks: data.tasks
      .filter(actionable)
      .map((t) => ({ id: t.id, title: t.title, deadline: t.deadline }))
      .slice(0, 8),
    freeSlot: free ?? null,
    suggestion: free
      ? (recommendations(data, date, free.end - free.start)[0]?.title ?? null)
      : null,
    habits: data.habits.map((h) => ({
      id: h.id,
      title: h.title,
      target: h.target,
      value: habitStats(h, data, date).value,
    })),
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

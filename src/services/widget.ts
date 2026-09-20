import { Data } from "../domain/types";
import { dayOrder } from "../domain/dayOrder";
import { availability } from "../domain/freeTime";
import { habitStats } from "../domain/analytics";
import { recommendations, actionable } from "../domain/priority";
import { dateKey, nowMinute } from "../domain/time";
export function widgetSnapshot(
  data: Data,
  date = dateKey(),
  minute = nowMinute(),
) {
  const order = dayOrder(date, data.calendar, data.settings);
  const next = data.classes
    .filter((c) => c.dayOrder === order.order && c.end > minute)
    .sort((a, b) => a.start - b.start)[0];
  const free = availability(data, date, minute)[0];
  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    date,
    dayOrder: order.order,
    nextClass: next
      ? {
          title: data.subjects.find((s) => s.id === next.subjectId)?.title,
          start: next.start,
          end: next.end,
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

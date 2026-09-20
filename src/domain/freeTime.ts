import { Data, Slot, Block } from "./types";
import { dayOrder } from "./dayOrder";
export function freeTime(
  wake: number,
  sleep: number,
  occupied: Slot[],
  buffer = 0,
  from = 0,
): Slot[] {
  const start = Math.max(wake, from);
  if (start >= sleep) return [];
  const sorted = occupied
    .map((b) => ({
      start: Math.max(start, b.start - buffer),
      end: Math.min(sleep, b.end + buffer),
    }))
    .filter((b) => b.end > b.start)
    .sort((a, b) => a.start - b.start);
  const slots: Slot[] = [];
  let cursor = start;
  for (const b of sorted) {
    if (b.start > cursor) slots.push({ start: cursor, end: b.start });
    cursor = Math.max(cursor, b.end);
  }
  if (cursor < sleep) slots.push({ start: cursor, end: sleep });
  return slots;
}
export function fixedBlocks(data: Data, date: string): Block[] {
  const s = data.settings,
    order = dayOrder(date, data.calendar, s),
    result = data.blocks.filter(
      (b) => b.date === date && b.kind !== "session" && b.status !== "Skipped",
    );
  const add = (
    id: string,
    title: string,
    start: number,
    end: number,
    kind = "routine",
  ) =>
    result.push({
      id,
      date,
      title,
      start,
      end,
      kind,
      taskId: null,
      status: "Scheduled",
    });
  if (order.order) {
    add(
      "college",
      "College + commute",
      Math.max(0, s.collegeStart - s.commute),
      s.collegeEnd + s.commute,
    );
    for (const c of data.classes.filter((c) => c.dayOrder === order.order))
      add(
        c.id,
        data.subjects.find((x) => x.id === c.subjectId)?.title ?? "Class",
        c.start,
        c.end,
        "class",
      );
  }
  add("lunch", "Lunch", s.lunch, s.lunch + s.mealDuration);
  add("dinner", "Dinner", s.dinner, s.dinner + s.mealDuration);
  return result;
}
export function availability(
  data: Data,
  date: string,
  from = 0,
  includeSessions = true,
): Slot[] {
  return freeTime(
    data.settings.wake,
    data.settings.sleep,
    [
      ...fixedBlocks(data, date),
      ...(includeSessions
        ? data.blocks.filter(
            (b) =>
              b.date === date &&
              b.kind === "session" &&
              !["Skipped", "Cancelled", "Missed"].includes(b.status),
          )
        : []),
    ],
    data.settings.buffer,
    from,
  );
}

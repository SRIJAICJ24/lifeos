import { Block, Data, Slot } from "./types";
import { availability } from "./freeTime";
import { recommendations, remaining } from "./priority";
import { addDays } from "./time";
export const intensityRatio = { Relaxed: 0.6, Balanced: 0.75, Focused: 0.9 };
export function schedule(data: Data, date: string, from = 0): Block[] {
  const slots = availability(data, date, from, false);
  const pinned = data.blocks.filter(
    (b) =>
      b.date === date &&
      b.kind === "session" &&
      ["Completed", "In Progress", "Partially Completed"].includes(b.status),
  );
  const clean = {
    ...data,
    blocks: [
      ...data.blocks.filter((b) => b.date !== date || b.kind !== "session"),
      ...pinned,
    ],
  };
  const open = availability(clean, date, from);
  let budget = Math.max(
    0,
    Math.floor(
      slots.reduce((n, s) => n + s.end - s.start, 0) *
        intensityRatio[data.settings.intensity],
    ) - pinned.reduce((n, b) => n + b.end - b.start, 0),
  );
  const allocated = new Map<string, number>();
  for (const b of data.blocks.filter(
    (b) =>
      b.kind === "session" &&
      b.date !== date &&
      b.status === "Scheduled" &&
      b.taskId,
  )) {
    allocated.set(b.taskId!, (allocated.get(b.taskId!) ?? 0) + b.end - b.start);
  }
  const result: Block[] = [];
  for (const slot of open) {
    let cursor = slot.start;
    while (cursor < slot.end && budget > 0) {
      const candidates = recommendations(
        clean,
        date,
        Math.min(slot.end - cursor, budget),
      ).filter(
        (t) =>
          remaining(t) > (allocated.get(t.id) ?? 0) &&
          (t.lifeArea !== "fitness" || cursor >= data.settings.workoutTime),
      );
      const task = candidates.find((t) => {
        const rem = remaining(t) - (allocated.get(t.id) ?? 0);
        return t.splittable
          ? Math.min(t.minimumSessionLength, rem) <=
              Math.min(slot.end - cursor, budget)
          : rem <= Math.min(slot.end - cursor, budget);
      });
      if (!task) {
        if (
          cursor < data.settings.workoutTime &&
          slot.end > data.settings.workoutTime
        ) {
          cursor = data.settings.workoutTime;
          continue;
        }
        break;
      }
      const rem = remaining(task) - (allocated.get(task.id) ?? 0);
      let length = task.splittable
        ? Math.min(rem, slot.end - cursor, budget, 90)
        : rem;
      if (
        task.splittable &&
        rem > length &&
        rem - length < task.minimumSessionLength &&
        rem - task.minimumSessionLength >= task.minimumSessionLength
      )
        length = rem - task.minimumSessionLength;
      result.push({
        id: `plan-${date}-${task.id}-${cursor}`,
        date,
        start: cursor,
        end: cursor + length,
        title: task.title,
        kind: "session",
        taskId: task.id,
        status: "Scheduled",
      });
      allocated.set(task.id, (allocated.get(task.id) ?? 0) + length);
      budget -= length;
      cursor += length + data.settings.buffer;
    }
  }
  return result;
}
export function nextSlot(
  data: Data,
  taskId: string,
  date: string,
  from = 0,
): { date: string; slot: Slot } | null {
  const task = data.tasks.find((t) => t.id === taskId);
  if (!task) return null;
  const min = task.splittable
    ? Math.min(task.minimumSessionLength, remaining(task))
    : remaining(task);
  if (min <= 0) return null;
  const clean = {
    ...data,
    blocks: data.blocks.filter(
      (b) => b.taskId !== taskId || b.status === "Completed",
    ),
  };
  for (let i = 0; i < 14; i++) {
    const d = addDays(date, i),
      slot = availability(clean, d, i === 0 ? from : 0).find(
        (s) => s.end - s.start >= min,
      );
    if (slot)
      return {
        date: d,
        slot: {
          start: slot.start,
          end:
            slot.start +
            Math.min(
              remaining(task),
              slot.end - slot.start,
              task.splittable ? 90 : Infinity,
            ),
        },
      };
  }
  return null;
}

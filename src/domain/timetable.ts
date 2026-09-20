import {
  ClassChange,
  ClassInstance,
  Data,
  Period,
  Slot,
  SlotKind,
  Subject,
} from "./types";
import { dayOrder } from "./dayOrder";
export const orderedPeriods = (data: Data): Period[] =>
  [...data.periods].sort((a, b) => a.position - b.position);
export const subjectOf = (data: Data, id: string | null): Subject | undefined =>
  id ? data.subjects.find((s) => s.id === id) : undefined;
export const subjectColour = (s: Subject | undefined) =>
  s?.colour || "#80B7FF";
export const subjectLabel = (s: Subject | undefined) =>
  s ? s.shortName || s.code || s.title : "Class";
/** Every slot code this student is registered for, with its room and kind. */
export function registration(data: Data) {
  return new Map(data.courseSlots.map((c) => [c.slotCode, c]));
}
/**
 * The personal timetable for one Day Order: the college grid intersected with registration.
 * Unregistered and blank grid cells are left out — they are free periods.
 */
export function timetableFor(data: Data, order: number): ClassInstance[] {
  const registered = registration(data);
  const cells = orderedPeriods(data).map((period) => {
    const cell = data.dayOrderSlots.find(
      (d) => d.dayOrder === order && d.position === period.position,
    );
    const slot = cell?.slotCode ? registered.get(cell.slotCode) : undefined;
    return { period, code: cell?.slotCode ?? "", slot };
  });
  const result: ClassInstance[] = [];
  for (const { period, code, slot } of cells) {
    if (!slot) continue;
    const subject = subjectOf(data, slot.subjectId);
    const last = result[result.length - 1];
    if (
      last &&
      last.subjectId === slot.subjectId &&
      last.kind === slot.kind &&
      last.positions[last.positions.length - 1] === period.position - 1
    ) {
      last.positions.push(period.position);
      last.end = period.end;
      if (last.slotCode !== code) last.slotCode += ` · ${code}`;
      continue;
    }
    result.push({
      key: `${order}-${period.position}`,
      date: "",
      dayOrder: order,
      positions: [period.position],
      subjectId: slot.subjectId,
      slotCode: code,
      kind: slot.kind,
      start: period.start,
      end: period.end,
      room: slot.room,
      faculty: subject?.facultyName ?? "",
      title: subject?.title ?? code,
      status: "Scheduled",
      note: "",
    });
  }
  return result;
}
const matches = (change: ClassChange, instance: ClassInstance) =>
  change.position > 0
    ? instance.positions.includes(change.position)
    : change.subjectId === instance.subjectId;
/** The timetable for a real date: Day Order resolved, then per-date changes applied. */
export function classesOn(data: Data, date: string): ClassInstance[] {
  const order = dayOrder(date, data.calendar, data.settings);
  const changes = data.classChanges.filter((c) => c.date === date);
  const base = order.order
    ? timetableFor(data, order.order).map((c) => ({
        ...c,
        key: `${date}-${c.positions[0]}`,
        date,
      }))
    : [];
  for (const change of changes) {
    if (change.status === "Extra class" || change.status === "Replacement") {
      const subject = subjectOf(data, change.subjectId);
      base.push({
        key: `${date}-extra-${change.id}`,
        date,
        dayOrder: order.order ?? 0,
        positions: change.position ? [change.position] : [],
        subjectId: change.subjectId,
        slotCode: change.slotCode,
        kind: "Theory",
        start: change.start,
        end: change.end,
        room: change.room,
        faculty: change.faculty || (subject?.facultyName ?? ""),
        title: subject?.title ?? change.slotCode ?? "Extra class",
        status: change.status,
        note: change.note,
      });
      continue;
    }
    for (const instance of base) {
      if (!matches(change, instance)) continue;
      instance.status = change.status;
      instance.note = change.note;
      if (change.status === "Room changed" && change.room)
        instance.room = change.room;
      if (change.status === "Faculty changed" && change.faculty)
        instance.faculty = change.faculty;
      if (change.status === "Time changed" && change.end > change.start) {
        instance.start = change.start;
        instance.end = change.end;
      }
    }
  }
  return base.sort((a, b) => a.start - b.start);
}
/** Classes that actually occupy time — a cancelled class gives its period back. */
export const activeClasses = (data: Data, date: string) =>
  classesOn(data, date).filter((c) => c.status !== "Cancelled");
export function nextClass(data: Data, date: string, minute: number) {
  return activeClasses(data, date).find((c) => c.end > minute) ?? null;
}
/** Gaps between the first and last class of the day — college free periods. */
export function collegeFreePeriods(data: Data, date: string): Slot[] {
  const classes = activeClasses(data, date);
  if (classes.length < 2) return [];
  const gaps: Slot[] = [];
  for (let i = 1; i < classes.length; i++) {
    const start = classes[i - 1]!.end,
      end = classes[i]!.start;
    if (end - start >= 20) gaps.push({ start, end });
  }
  return gaps;
}
/** The span college keeps you on campus, including commute either side. */
export function campusSpan(data: Data, date: string): Slot | null {
  const classes = activeClasses(data, date);
  if (!classes.length) return null;
  const commute = data.settings.commute;
  return {
    start: Math.max(0, classes[0]!.start - commute),
    end: Math.min(1440, classes[classes.length - 1]!.end + commute),
  };
}
export const slotKindColour = (kind: SlotKind) =>
  kind === "Lab"
    ? "#F1A079"
    : kind === "Practical"
      ? "#A7D794"
      : kind === "Project"
        ? "#EDA7C9"
        : "#80B7FF";

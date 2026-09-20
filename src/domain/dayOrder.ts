import { CalendarDate, Settings } from "./types";
import { addDays, daysBetween, parseDate } from "./time";
export interface DayOrderResult {
  order: number | null;
  type: string;
  note: string;
  entry?: CalendarDate;
}
/**
 * The Day Order for a date. The rotation advances across working days only, so a holiday or a
 * weekend never consumes an order. `working` on a calendar row is the authority — that is what
 * lets a special working Saturday advance the rotation while a weekday college event does not.
 */
export function dayOrder(
  date: string,
  entries: CalendarDate[],
  settings: Settings,
): DayOrderResult {
  const map = new Map(entries.map((x) => [x.date, x]));
  const weekend = (d: string) =>
    settings.weekends.split(",").includes(String(parseDate(d).getDay()));
  const working = (d: string) => {
    const e = map.get(d);
    return e ? e.working === 1 : !weekend(d);
  };
  const direct = map.get(date);
  if (!working(date))
    return {
      order: null,
      type: direct?.type ?? "Weekend",
      note: direct?.note ?? "A little room for life.",
      entry: direct,
    };
  if (direct?.dayOrder)
    return {
      order: direct.dayOrder,
      type: direct.type,
      note: direct.note,
      entry: direct,
    };
  const delta = daysBetween(settings.anchorDate, date);
  if (Math.abs(delta) > 36600)
    return {
      order: null,
      type: "Unassigned",
      note: "Choose a closer calendar anchor.",
    };
  let order = settings.anchorOrder;
  if (delta >= 0) {
    for (let i = 0; i <= delta; i++) {
      const d = addDays(settings.anchorDate, i),
        e = map.get(d);
      if (e?.dayOrder && working(d)) order = e.dayOrder;
      if (d === date) break;
      if (working(d)) order = (order % 5) + 1;
    }
  } else {
    for (let i = -1; i >= delta; i--)
      if (working(addDays(settings.anchorDate, i)))
        order = ((order + 3) % 5) + 1;
  }
  return {
    order,
    type: direct?.type ?? "Academic Day",
    note: direct?.note ?? "Your regular academic rotation",
    entry: direct,
  };
}
/** Day types that keep classes running; used when a calendar row is created from the UI. */
export const worksByDefault = (type: string) =>
  ["Academic Day", "Manual Override", "Special Timetable", "Special Working Day"].includes(
    type,
  );

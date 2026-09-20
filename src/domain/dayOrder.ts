import { CalendarDate, Settings } from "./types";
import { addDays, daysBetween, parseDate } from "./time";
export function dayOrder(
  date: string,
  entries: CalendarDate[],
  settings: Settings,
): { order: number | null; type: string; note: string } {
  const direct = entries.find((x) => x.date === date);
  const weekend = (d: string) =>
    settings.weekends.split(",").includes(String(parseDate(d).getDay()));
  const map = new Map(entries.map((x) => [x.date, x]));
  const academic = (d: string) => {
    const e = map.get(d);
    return e
      ? ["Academic Day", "Manual Override", "Special Timetable"].includes(
          e.type,
        )
      : !weekend(d);
  };
  if (direct && !academic(date))
    return { order: null, type: direct.type, note: direct.note };
  if (!direct && weekend(date))
    return {
      order: null,
      type: "Non-Academic Day",
      note: "A little room for life.",
    };
  if (direct?.dayOrder)
    return { order: direct.dayOrder, type: direct.type, note: direct.note };
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
      if (e?.dayOrder && academic(d)) order = e.dayOrder;
      if (d === date) break;
      if (academic(d)) order = (order % 5) + 1;
    }
  } else {
    for (let i = -1; i >= delta; i--) {
      if (academic(addDays(settings.anchorDate, i)))
        order = ((order + 3) % 5) + 1;
    }
  }
  return {
    order,
    type: direct?.type ?? "Academic Day",
    note: direct?.note ?? "Your regular academic rotation",
  };
}

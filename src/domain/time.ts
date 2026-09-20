export function dateKey(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export function parseDate(s: string): Date {
  return new Date(`${s}T12:00:00`);
}
export function addDays(s: string, n: number): string {
  const d = parseDate(s);
  d.setDate(d.getDate() + n);
  return dateKey(d);
}
export function addMonths(s: string, n: number): string {
  const d = parseDate(s),
    day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + n);
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, last));
  return dateKey(d);
}
export function daysBetween(a: string, b: string): number {
  return Math.round(
    (Date.parse(b + "T12:00:00Z") - Date.parse(a + "T12:00:00Z")) / 86400000,
  );
}
export function clock(m: number): string {
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}
export function minutes(s: string): number {
  if (!/^\d{2}:\d{2}$/.test(s)) throw new Error("Use a time like 07:30.");
  const [h, m] = s.split(":").map(Number);
  if (h! > 23 || m! > 59) throw new Error("Time is outside the day.");
  return h! * 60 + m!;
}
export function validDate(s: string): boolean {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(s) &&
    !isNaN(parseDate(s).getTime()) &&
    dateKey(parseDate(s)) === s
  );
}
export const duration = (m: number) =>
  m >= 60
    ? `${Math.floor(m / 60)}h${m % 60 ? " " + Math.round(m % 60) + "m" : ""}`
    : `${Math.round(m)}m`;
export const nowMinute = () =>
  new Date().getHours() * 60 + new Date().getMinutes();
export const uid = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

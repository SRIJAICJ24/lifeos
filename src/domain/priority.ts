import { Data, Task } from "./types";
import { daysBetween } from "./time";
export const remaining = (t: Task) =>
  Math.max(0, Math.ceil(t.estimatedDuration * (1 - t.progress / 100)));
export const actionable = (t: Task) =>
  !["Completed", "Cancelled", "Skipped"].includes(t.status) && remaining(t) > 0;
export function unblocked(t: Task, data: Data): boolean {
  return data.dependencies
    .filter((d) => d.taskId === t.id)
    .every(
      (d) =>
        data.tasks.find((x) => x.id === d.dependsOnId)?.status === "Completed",
    );
}
export function priority(t: Task, date: string, data: Data): number {
  const days = t.deadline ? daysBetween(date, t.deadline.slice(0, 10)) : 365;
  const urgency =
    days < 0
      ? 100
      : days === 0
        ? 85
        : days <= 1
          ? 65
          : days <= 3
            ? 45
            : days <= 7
              ? 25
              : 0;
  const risk = t.deadline
    ? Math.min(30, remaining(t) / Math.max(1, days + 1) / 10)
    : 0;
  const dependents =
    data.dependencies.filter((d) => d.dependsOnId === t.id).length * 8;
  const exam = data.tasks.some(
    (e) =>
      e.subjectId &&
      e.subjectId === t.subjectId &&
      e.subcategory === "Exam" &&
      e.deadline &&
      daysBetween(date, e.deadline) <= 7,
  )
    ? 15
    : 0;
  return (
    urgency +
    t.importance * 5 +
    t.priority * 8 +
    risk +
    dependents +
    exam +
    (100 - t.progress) / 20
  );
}
export function recommendations(
  data: Data,
  date: string,
  minutes: number,
): Task[] {
  return data.tasks
    .filter(
      (t) =>
        actionable(t) &&
        t.status !== "In Progress" &&
        !t.fixed &&
        unblocked(t, data) &&
        (t.splittable
          ? Math.min(t.minimumSessionLength, remaining(t))
          : remaining(t)) <= minutes,
    )
    .sort(
      (a, b) =>
        priority(b, date, data) - priority(a, date, data) ||
        a.createdAt.localeCompare(b.createdAt) ||
        a.id.localeCompare(b.id),
    );
}

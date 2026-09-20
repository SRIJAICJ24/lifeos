import { Assessment, Data, SyllabusTopic } from "./types";
import { addDays, daysBetween } from "./time";
import { availability } from "./freeTime";
import {
  assessmentPreparation,
  assignmentOpen,
  assignmentRemaining,
  practised,
  studied,
} from "./academic";
export const revisionIntervals = [1, 3, 7, 14, 30];
export const nextRevisionDate = (topic: SyllabusTopic, from: string) =>
  addDays(
    from,
    revisionIntervals[Math.min(topic.revisionCount, revisionIntervals.length - 1)]!,
  );
export interface StudySuggestion {
  id: string;
  kind: "Assignment" | "Learn" | "Practice" | "Revision";
  subjectId: string;
  title: string;
  detail: string;
  reason: string;
  minutes: number;
  score: number;
  topicId?: string;
  assignmentId?: string;
}
const urgency = (days: number) =>
  days < 0 ? 100 : days === 0 ? 90 : days <= 1 ? 70 : days <= 3 ? 50 : days <= 7 ? 30 : 10;
/**
 * Ranks what to study right now from deadlines, exam proximity, syllabus gaps, flagged topics
 * and how long since each was revised. Every suggestion carries the reason it was chosen.
 */
export function studySuggestions(
  data: Data,
  date: string,
  available: number,
): StudySuggestion[] {
  const out: StudySuggestion[] = [];
  const name = (id: string) => {
    const s = data.subjects.find((x) => x.id === id);
    return s?.shortName || s?.title || "Subject";
  };
  for (const a of data.assignments.filter(assignmentOpen)) {
    const remaining = assignmentRemaining(a);
    if (!remaining) continue;
    const days = daysBetween(date, a.dueDate);
    if (days > 14) continue;
    out.push({
      id: `assignment-${a.id}`,
      assignmentId: a.id,
      kind: "Assignment",
      subjectId: a.subjectId,
      title: a.title,
      detail: `${name(a.subjectId)} · ${a.progress}% done`,
      reason:
        days < 0
          ? "Past its due date"
          : days === 0
            ? "Due today"
            : days === 1
              ? "Due tomorrow"
              : `Due in ${days} days`,
      minutes: Math.min(remaining, Math.max(15, available)),
      score: urgency(days) + a.priority * 8 + 25,
    });
  }
  const upcoming = data.assessments
    .filter((a) => a.date >= date)
    .sort((a, b) => a.date.localeCompare(b.date));
  const examFor = new Map<string, Assessment>();
  for (const a of upcoming) if (!examFor.has(a.subjectId)) examFor.set(a.subjectId, a);
  const linkedTo = new Map<string, Assessment>();
  for (const a of upcoming)
    for (const link of data.assessmentTopics.filter((t) => t.assessmentId === a.id))
      if (!linkedTo.has(link.topicId)) linkedTo.set(link.topicId, a);
  for (const topic of data.syllabusTopics) {
    const exam = linkedTo.get(topic.id) ?? examFor.get(topic.subjectId);
    const days = exam ? daysBetween(date, exam.date) : 60;
    const dueForRevision =
      practised(topic) &&
      (!topic.nextRevision || topic.nextRevision <= date) &&
      topic.lastRevised !== date;
    if (practised(topic) && !dueForRevision && !topic.weak) continue;
    const kind = !studied(topic)
      ? "Learn"
      : !practised(topic)
        ? "Practice"
        : "Revision";
    const gap = kind === "Learn" ? 22 : kind === "Practice" ? 16 : 8;
    const stale = topic.lastRevised
      ? Math.min(15, daysBetween(topic.lastRevised, date))
      : 6;
    const reasons: string[] = [];
    if (exam && days <= 10)
      reasons.push(
        `${exam.title} in ${days} day${days === 1 ? "" : "s"}`.replace(
          "in 0 days",
          "today",
        ),
      );
    if (topic.teacherImportant) reasons.push("Marked important in class");
    else if (topic.importance >= 2) reasons.push("Very important");
    else if (topic.importance === 1) reasons.push("Important");
    if (topic.weak) reasons.push("Flagged as weak");
    if (topic.pyqCount >= 2) reasons.push(`Asked ${topic.pyqCount} times before`);
    if (kind === "Learn") reasons.push("Not studied yet");
    else if (kind === "Practice") reasons.push("Understood but not practised");
    else reasons.push("Due for revision");
    out.push({
      id: `topic-${topic.id}`,
      topicId: topic.id,
      kind,
      subjectId: topic.subjectId,
      title: topic.title,
      detail: `${name(topic.subjectId)} · ${topic.state}`,
      reason: reasons.slice(0, 3).join(" · "),
      minutes: topic.estimatedMinutes || 30,
      score:
        (exam ? urgency(days) : 5) +
        gap +
        stale +
        topic.importance * 10 +
        topic.teacherImportant * 12 +
        topic.weak * 10 +
        Math.min(12, topic.pyqCount * 4),
    });
  }
  return out
    .filter((s) => !available || s.minutes <= Math.max(available, 15))
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));
}
/** Remaining topics for an exam, and whether the free time before it is enough. */
export function examPlan(data: Data, assessment: Assessment, date: string) {
  const prep = assessmentPreparation(data, assessment);
  const days = daysBetween(date, assessment.date);
  let free = 0;
  for (let i = 0; i <= Math.max(0, Math.min(days, 30)); i++) {
    const d = addDays(date, i);
    free += availability(data, d).reduce((n, s) => n + s.end - s.start, 0);
  }
  const needed = prep.minutesRemaining;
  return {
    ...prep,
    days,
    needed,
    free,
    onTrack: needed === 0 || free >= needed,
    status:
      needed === 0
        ? "Ready"
        : free >= needed * 1.5
          ? "Comfortable"
          : free >= needed
            ? "On track"
            : "Tight — consider trimming or starting earlier",
  };
}

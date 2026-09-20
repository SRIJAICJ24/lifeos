import {
  Assessment,
  Assignment,
  AttendanceRecord,
  Data,
  Subject,
  SyllabusTopic,
  TopicState,
} from "./types";
import { addDays, daysBetween } from "./time";
import { activeClasses } from "./timetable";
const stateRank: Record<TopicState, number> = {
  "Not started": 0,
  Learning: 1,
  Understood: 2,
  Practised: 3,
  Revised: 4,
  Mastered: 5,
};
export const studied = (t: SyllabusTopic) => stateRank[t.state] >= 2;
export const practised = (t: SyllabusTopic) => stateRank[t.state] >= 3;
export const revised = (t: SyllabusTopic) =>
  stateRank[t.state] >= 4 || t.revisionCount > 0;
const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);
/** Class coverage, personal study and revision are tracked separately on purpose. */
export function syllabusProgress(topics: SyllabusTopic[]) {
  const total = topics.length;
  return {
    total,
    covered: pct(topics.filter((t) => t.classCovered).length, total),
    studied: pct(topics.filter(studied).length, total),
    revised: pct(topics.filter(revised).length, total),
    overall: total
      ? Math.round(
          (topics.reduce((n, t) => n + stateRank[t.state], 0) / (total * 5)) *
            100,
        )
      : 0,
    remaining: topics.filter((t) => !practised(t)),
  };
}
export const subjectTopics = (data: Data, subjectId: string) =>
  data.syllabusTopics.filter((t) => t.subjectId === subjectId);
export function attendanceStats(
  records: AttendanceRecord[],
  threshold: number,
) {
  const counted = records.filter((r) =>
    ["Present", "Absent", "OD"].includes(r.state),
  );
  const held = counted.length,
    present = records.filter((r) => r.state === "Present").length,
    od = records.filter((r) => r.state === "OD").length,
    absent = records.filter((r) => r.state === "Absent").length,
    attended = present + od,
    cancelled = records.filter((r) => r.state === "Cancelled").length;
  const ratio = held ? attended / held : 1;
  const target = threshold / 100;
  return {
    held,
    attended,
    present,
    od,
    absent,
    cancelled,
    percentage: held ? Math.round(ratio * 1000) / 10 : 0,
    /** How many more classes may be missed while staying at or above the threshold. */
    canMiss: held
      ? Math.max(0, Math.floor(attended / target - held))
      : 0,
    /** How many consecutive classes must be attended to climb back to the threshold. */
    mustAttend:
      !held || ratio >= target
        ? 0
        : Math.ceil((target * held - attended) / (1 - target)),
    ifAttendNext: (n: number) => pct(attended + n, held + n),
    ifMissNext: (n: number) => pct(attended, held + n),
    atRisk: held > 0 && ratio < target,
    nearRisk: held > 0 && ratio >= target && ratio < target + 0.05,
  };
}
export const subjectAttendance = (data: Data, subjectId: string) =>
  attendanceStats(
    data.attendance.filter((a) => a.subjectId === subjectId),
    data.settings.attendanceThreshold,
  );
export const assignmentRemaining = (a: Assignment) =>
  Math.max(0, Math.ceil(a.estimatedDuration * (1 - a.progress / 100)));
export const assignmentOpen = (a: Assignment) =>
  !["Submitted", "Graded"].includes(a.status);
/** Work can be finished without the submission having happened — they are tracked apart. */
export const awaitingSubmission = (a: Assignment) =>
  a.progress >= 100 && !a.submissionConfirmed && assignmentOpen(a);
export function assessmentPreparation(data: Data, assessment: Assessment) {
  const linked = data.assessmentTopics
    .filter((a) => a.assessmentId === assessment.id)
    .map((a) => data.syllabusTopics.find((t) => t.id === a.topicId))
    .filter((t): t is SyllabusTopic => !!t);
  const done = linked.filter(practised);
  return {
    topics: linked,
    done,
    remaining: linked.filter((t) => !practised(t)),
    progress: pct(done.length, linked.length),
    minutesRemaining: linked
      .filter((t) => !practised(t))
      .reduce((n, t) => n + t.estimatedMinutes, 0),
  };
}
export interface Deadline {
  id: string;
  kind: "Assignment" | "Assessment";
  title: string;
  subjectId: string;
  date: string;
  days: number;
  remaining: number;
  progress: number;
  status: string;
}
export function deadlines(data: Data, date: string): Deadline[] {
  const list: Deadline[] = [];
  for (const a of data.assignments.filter(assignmentOpen))
    list.push({
      id: a.id,
      kind: "Assignment",
      title: a.title,
      subjectId: a.subjectId,
      date: a.dueDate,
      days: daysBetween(date, a.dueDate),
      remaining: assignmentRemaining(a),
      progress: a.progress,
      status: a.status,
    });
  for (const a of data.assessments.filter((x) => x.date >= date)) {
    const prep = assessmentPreparation(data, a);
    list.push({
      id: a.id,
      kind: "Assessment",
      title: a.title,
      subjectId: a.subjectId,
      date: a.date,
      days: daysBetween(date, a.date),
      remaining: prep.minutesRemaining,
      progress: prep.progress,
      status: a.assessmentType,
    });
  }
  return list.sort((a, b) => a.days - b.days || b.remaining - a.remaining);
}
export const radarBands = (list: Deadline[]) => [
  { label: "Today", items: list.filter((d) => d.days === 0) },
  { label: "Tomorrow", items: list.filter((d) => d.days === 1) },
  { label: "Next 3 days", items: list.filter((d) => d.days > 1 && d.days <= 3) },
  { label: "This week", items: list.filter((d) => d.days > 3 && d.days <= 7) },
  { label: "Next week", items: list.filter((d) => d.days > 7 && d.days <= 14) },
  { label: "Overdue", items: list.filter((d) => d.days < 0) },
];
export interface Risk {
  id: string;
  title: string;
  detail: string;
  tone: "warn" | "note";
  subjectId?: string;
}
/** Transparent rules, not a score. Each line says exactly what triggered it. */
export function risks(data: Data, date: string): Risk[] {
  const out: Risk[] = [];
  const name = (id: string) =>
    data.subjects.find((s) => s.id === id)?.shortName ||
    data.subjects.find((s) => s.id === id)?.title ||
    "Subject";
  for (const subject of data.subjects.filter((s) => s.active)) {
    const a = subjectAttendance(data, subject.id);
    if (a.atRisk)
      out.push({
        id: `att-${subject.id}`,
        subjectId: subject.id,
        tone: "warn",
        title: `${name(subject.id)} attendance is ${a.percentage}%`,
        detail: `Below your ${data.settings.attendanceThreshold}% threshold. Attending the next ${a.mustAttend} would bring it back.`,
      });
    else if (a.nearRisk)
      out.push({
        id: `att-${subject.id}`,
        subjectId: subject.id,
        tone: "note",
        title: `${name(subject.id)} attendance is ${a.percentage}%`,
        detail: `Close to the threshold — ${a.canMiss} class${a.canMiss === 1 ? "" : "es"} of room left.`,
      });
    const topics = subjectTopics(data, subject.id);
    const p = syllabusProgress(topics);
    if (topics.length && p.covered - p.studied > 25)
      out.push({
        id: `syl-${subject.id}`,
        subjectId: subject.id,
        tone: "note",
        title: `${name(subject.id)} self-study is behind class`,
        detail: `Class has covered ${p.covered}%, you have studied ${p.studied}%.`,
      });
  }
  for (const d of deadlines(data, date)) {
    if (d.kind === "Assignment" && d.days < 0)
      out.push({
        id: `due-${d.id}`,
        subjectId: d.subjectId,
        tone: "warn",
        title: `${d.title} is past its due date`,
        detail: `${name(d.subjectId)} · was due ${d.date}.`,
      });
    else if (d.kind === "Assignment" && d.days <= 1 && d.progress < 60)
      out.push({
        id: `due-${d.id}`,
        subjectId: d.subjectId,
        tone: "warn",
        title: `${d.title} is due ${d.days === 0 ? "today" : "tomorrow"}`,
        detail: `${d.progress}% done · about ${d.remaining} minutes left.`,
      });
    else if (d.kind === "Assessment" && d.days <= 5 && d.progress < 70)
      out.push({
        id: `exam-${d.id}`,
        subjectId: d.subjectId,
        tone: "note",
        title: `${d.title} in ${d.days} day${d.days === 1 ? "" : "s"}`,
        detail: `Preparation ${d.progress}% · about ${d.remaining} minutes of topics left.`,
      });
  }
  for (const a of data.assignments.filter(awaitingSubmission))
    out.push({
      id: `sub-${a.id}`,
      subjectId: a.subjectId,
      tone: "warn",
      title: `${a.title} is finished but not submitted`,
      detail: `${name(a.subjectId)} · mark the submission once it is in.`,
    });
  return out;
}
export function weeklyReview(data: Data, date: string) {
  const start = addDays(date, -6);
  const within = (d: string) => d >= start && d <= date;
  const records = data.attendance.filter((a) => within(a.date));
  const sessions = data.studySessions.filter(
    (s) => within(s.date) && s.actualDuration > 0,
  );
  const topics = data.syllabusTopics;
  return {
    start,
    attended: records.filter((r) => ["Present", "OD"].includes(r.state)).length,
    missed: records.filter((r) => r.state === "Absent").length,
    attendance: attendanceStats(records, data.settings.attendanceThreshold)
      .percentage,
    studyMinutes: sessions.reduce((n, s) => n + s.actualDuration, 0),
    sessions: sessions.length,
    revisions: sessions.filter((s) => s.sessionType === "Revision").length,
    assignmentsDone: data.assignments.filter(
      (a) => a.submittedAt && within(a.submittedAt.slice(0, 10)),
    ).length,
    assignmentsPending: data.assignments.filter(assignmentOpen).length,
    topicsStudied: topics.filter((t) => within(t.lastRevised) || studied(t))
      .length,
    testsTaken: data.assessments.filter(
      (a) => within(a.date) && a.actualMark >= 0,
    ).length,
    nextWeek: deadlines(data, date).filter((d) => d.days >= 0 && d.days <= 14),
  };
}
/** Which classes happened today, so attendance can be marked in one pass. */
export function attendanceQueue(data: Data, date: string) {
  return activeClasses(data, date)
    .filter((c) => c.subjectId)
    .map((c) => ({
      instance: c,
      records: c.positions.map(
        (position) =>
          data.attendance.find(
            (a) =>
              a.subjectId === c.subjectId &&
              a.date === date &&
              a.position === position,
          ) ?? null,
      ),
    }));
}
export const subjectMarks = (data: Data, subjectId: string) => {
  const rows = data.marks.filter((m) => m.subjectId === subjectId);
  const weighted = rows.filter((m) => m.weightage > 0 && m.maximum > 0);
  return {
    rows,
    total: weighted.reduce(
      (n, m) => n + (m.obtained / m.maximum) * m.weightage,
      0,
    ),
    outOf: weighted.reduce((n, m) => n + m.weightage, 0),
    average: rows.length
      ? Math.round(
          (rows
            .filter((m) => m.maximum > 0)
            .reduce((n, m) => n + m.obtained / m.maximum, 0) /
            Math.max(1, rows.filter((m) => m.maximum > 0).length)) *
            100,
        )
      : 0,
  };
};
export const displayName = (s: Subject | undefined) =>
  s ? s.shortName || s.code || s.title : "Subject";

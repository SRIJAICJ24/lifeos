import React from "react";
import { Text, View } from "react-native";
import { useLife } from "../../state/store";
import { Card, Empty, Progress, Stat } from "../../ui/components";
import { styles as s, colors } from "../../ui/theme";
import { subjectColour } from "../../domain/timetable";
import {
  displayName,
  subjectAttendance,
  subjectTopics,
  syllabusProgress,
  weeklyReview,
} from "../../domain/academic";
import { addDays, dateKey, duration } from "../../domain/time";
const Bar = ({
  label,
  value,
  max,
  color,
  hint,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
  hint: string;
}) => (
  <View style={{ gap: 6 }}>
    <View style={[s.row, { justifyContent: "space-between" }]}>
      <Text style={s.text}>{label}</Text>
      <Text style={s.muted}>{hint}</Text>
    </View>
    <Progress value={max ? (value / max) * 100 : 0} color={color} />
  </View>
);
export function AcademicAnalytics() {
  const { data } = useLife(),
    today = dateKey();
  const review = weeklyReview(data, today);
  const sessions = data.studySessions.filter((x) => x.actualDuration > 0);
  const bySubject = data.subjects.map((subject) => ({
    subject,
    minutes: sessions
      .filter((x) => x.subjectId === subject.id)
      .reduce((n, x) => n + x.actualDuration, 0),
  }));
  const maxMinutes = Math.max(1, ...bySubject.map((x) => x.minutes));
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(today, i - 6);
    return {
      date: d,
      minutes: sessions
        .filter((x) => x.date === d)
        .reduce((n, x) => n + x.actualDuration, 0),
    };
  });
  const maxDay = Math.max(1, ...week.map((d) => d.minutes));
  const graded = data.assessments.filter((a) => a.actualMark >= 0 && a.maximumMarks > 0);
  return (
    <>
      <Card>
        <Text style={s.h2}>This academic week</Text>
        <Text style={s.muted}>Since {review.start}</Text>
        <View style={s.wrap}>
          <Stat
            label="Study"
            value={duration(review.studyMinutes)}
            hint={`${review.sessions} sessions`}
            color={colors.accent}
          />
          <Stat
            label="Attendance"
            value={review.attended + review.missed ? `${review.attendance}%` : "—"}
            hint={`${review.attended} attended · ${review.missed} missed`}
            color={colors.academic}
          />
          <Stat
            label="Assignments"
            value={`${review.assignmentsDone}`}
            hint={`${review.assignmentsPending} still open`}
            color={colors.skills}
          />
          <Stat
            label="Revision"
            value={String(review.revisions)}
            hint="sessions"
            color={colors.diet}
          />
        </View>
        {review.nextWeek.length ? (
          <Text style={[s.muted, { fontSize: 11 }]}>
            Ahead:{" "}
            {review.nextWeek
              .slice(0, 4)
              .map((d) => `${d.title} (${d.days}d)`)
              .join(" · ")}
          </Text>
        ) : null}
      </Card>
      <Card>
        <Text style={s.h2}>Study time by subject</Text>
        {bySubject.some((x) => x.minutes) ? (
          bySubject
            .sort((a, b) => b.minutes - a.minutes)
            .map(({ subject, minutes }) => (
              <Bar
                key={subject.id}
                label={subject.title}
                value={minutes}
                max={maxMinutes}
                color={subjectColour(subject)}
                hint={duration(minutes)}
              />
            ))
        ) : (
          <Empty text="Log a study session and this fills in." />
        )}
      </Card>
      <Card>
        <Text style={s.h2}>Study in the last seven days</Text>
        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-end",
            gap: 8,
            height: 110,
          }}
        >
          {week.map((d) => (
            <View key={d.date} style={{ flex: 1, alignItems: "center", gap: 6 }}>
              <View
                accessibilityLabel={`${d.date}: ${d.minutes} minutes`}
                style={{
                  width: "100%",
                  height: Math.max(3, (d.minutes / maxDay) * 80),
                  backgroundColor: d.minutes ? colors.accent : colors.border,
                  borderRadius: 6,
                }}
              />
              <Text style={[s.muted, { fontSize: 10 }]}>{d.date.slice(8)}</Text>
            </View>
          ))}
        </View>
      </Card>
      <Card>
        <Text style={s.h2}>Class coverage against your study</Text>
        {data.subjects.map((subject) => {
          const p = syllabusProgress(subjectTopics(data, subject.id));
          return (
            <View key={subject.id} style={{ gap: 6 }}>
              <View style={[s.row, { justifyContent: "space-between" }]}>
                <Text style={s.text}>{displayName(subject)}</Text>
                <Text style={s.muted}>
                  class {p.covered}% · you {p.studied}%
                </Text>
              </View>
              <Progress value={p.covered} color={colors.border} />
              <Progress value={p.studied} color={subjectColour(subject)} />
            </View>
          );
        })}
        {!data.subjects.length && <Empty text="No subjects yet." />}
      </Card>
      <Card>
        <Text style={s.h2}>Attendance by subject</Text>
        {data.subjects.map((subject) => {
          const a = subjectAttendance(data, subject.id);
          return (
            <Bar
              key={subject.id}
              label={displayName(subject)}
              value={a.percentage}
              max={100}
              color={a.atRisk ? "#FF9C9C" : subjectColour(subject)}
              hint={a.held ? `${a.percentage}% of ${a.held}h` : "not logged"}
            />
          );
        })}
        {!data.subjects.length && <Empty text="No subjects yet." />}
      </Card>
      <Card>
        <Text style={s.h2}>Assessment marks</Text>
        {graded.length ? (
          graded
            .sort((a, b) => a.date.localeCompare(b.date))
            .map((a) => (
              <Bar
                key={a.id}
                label={`${a.title} · ${displayName(data.subjects.find((x) => x.id === a.subjectId))}`}
                value={a.actualMark}
                max={a.maximumMarks}
                color={subjectColour(data.subjects.find((x) => x.id === a.subjectId))}
                hint={`${a.actualMark} / ${a.maximumMarks}`}
              />
            ))
        ) : (
          <Empty text="Record a mark on a test and it appears here." />
        )}
      </Card>
    </>
  );
}

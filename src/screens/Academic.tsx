import React, { useState } from "react";
import { Text, View, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useLife } from "../state/store";
import {
  Card,
  Button,
  Tag,
  Empty,
  Progress,
  Stat,
  ListRow,
  Icon,
  Editor,
} from "../ui/components";
import { styles as s, colors } from "../ui/theme";
import { dayOrder } from "../domain/dayOrder";
import {
  activeClasses,
  collegeFreePeriods,
  subjectColour,
} from "../domain/timetable";
import {
  deadlines,
  displayName,
  risks,
  syllabusProgress,
  assignmentOpen,
} from "../domain/academic";
import { studySuggestions } from "../domain/study";
import { availability } from "../domain/freeTime";
import { dateKey, clock, duration, parseDate } from "../domain/time";
const sections = [
  ["timetable", "Timetable", "clock"],
  ["subjects", "Subjects", "book-open"],
  ["assignments", "Assignments", "file-text"],
  ["assessments", "Tests & exams", "award"],
  ["syllabus", "Syllabus", "list"],
  ["attendance", "Attendance", "check-square"],
  ["study", "Study plan", "target"],
  ["announcements", "Announcements", "bell"],
  ["marks", "Marks", "bar-chart-2"],
  ["materials", "Materials", "folder"],
  ["calendar", "Academic calendar", "calendar"],
  ["analytics", "Analytics", "trending-up"],
  ["inbox", "Inbox", "inbox"],
  ["search", "Search", "search"],
] as const;
const dayName = (date: string) =>
  parseDate(date).toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
export function Academic() {
  const { data, act, minute } = useLife(),
    router = useRouter(),
    today = dateKey();
  const order = dayOrder(today, data.calendar, data.settings);
  const classes = activeClasses(data, today);
  const next = classes.find((c) => c.end > minute);
  const gaps = collegeFreePeriods(data, today);
  const free = availability(data, today, minute);
  const due = deadlines(data, today);
  const attention = risks(data, today);
  const study = studySuggestions(
    data,
    today,
    free[0] ? free[0].end - free[0].start : 60,
  ).slice(0, 3);
  const [override, setOverride] = useState(false);
  const active = data.subjects.filter((x) => x.active);
  const allTopics = data.syllabusTopics;
  const progress = syllabusProgress(allTopics);
  const attendanceRows = data.attendance;
  const held = attendanceRows.filter((r) =>
    ["Present", "Absent", "OD"].includes(r.state),
  ).length;
  const attended = attendanceRows.filter((r) =>
    ["Present", "OD"].includes(r.state),
  ).length;
  const openAssignments = data.assignments.filter(assignmentOpen).length;
  const go = (section: string) =>
    router.push({ pathname: "/academic/[section]", params: { section } });
  const add = (section: string) =>
    router.push({ pathname: "/academic/[section]", params: { section, add: "1" } });
  if (!active.length)
    return (
      <Card>
        <Empty
          text="No subjects yet. Restore the semester setup, or add your courses by hand."
          action={
            <View style={s.wrap}>
              <Button
                title="Restore semester setup"
                onPress={() =>
                  void act(
                    (e) => e.restoreAcademicSetup(),
                    "Semester setup restored",
                  )
                }
              />
              <Button
                title="Open subjects"
                kind="secondary"
                onPress={() => go("subjects")}
              />
            </View>
          }
        />
      </Card>
    );
  return (
    <>
      <Card>
        <View style={[s.row, { justifyContent: "space-between" }]}>
          <View style={s.grow}>
            <Text style={s.muted}>{dayName(today)}</Text>
            <Text style={[s.title, { fontSize: 27, marginTop: 4 }]}>
              {order.order ? `Day Order ${order.order}` : order.type}
            </Text>
          </View>
          <Tag
            text={order.entry?.type.toUpperCase() ?? "REGULAR"}
            color={colors.academic}
          />
        </View>
        <Text style={s.muted}>
          {order.entry?.eventTitle || order.note}
        </Text>
        <View style={s.wrap}>
          <Button
            title="Day Order override"
            kind="secondary"
            icon="repeat"
            onPress={() => setOverride(true)}
          />
          <Button
            title="Mark attendance"
            kind="secondary"
            icon="check-square"
            onPress={() => go("attendance")}
          />
        </View>
      </Card>
      <Card>
        <Text style={s.label}>QUICK ADD</Text>
        <View style={s.wrap}>
          <Button
            title="Assignment"
            kind="secondary"
            icon="plus"
            onPress={() => add("assignments")}
          />
          <Button
            title="Test or exam"
            kind="secondary"
            icon="plus"
            onPress={() => add("assessments")}
          />
          <Button
            title="Announcement"
            kind="secondary"
            icon="plus"
            onPress={() => add("announcements")}
          />
          <Button
            title="Study log"
            kind="secondary"
            icon="plus"
            onPress={() => go("study")}
          />
          <Button
            title="Academic date"
            kind="secondary"
            icon="plus"
            onPress={() => go("calendar")}
          />
          <Button
            title="Quick note"
            kind="secondary"
            icon="plus"
            onPress={() => go("inbox")}
          />
        </View>
      </Card>
      {next ? (
        <Card style={{ borderColor: colors.academic + "55" }}>
          <Tag text="NEXT CLASS" color={colors.academic} />
          <Text style={[s.h2, { fontSize: 25 }]}>{next.title}</Text>
          <Text style={s.muted}>
            {clock(next.start)} – {clock(next.end)}
            {next.room ? ` · ${next.room}` : ""} · {next.kind}
            {next.faculty ? ` · ${next.faculty}` : ""}
          </Text>
          {next.status !== "Scheduled" && (
            <Tag text={next.status.toUpperCase()} color={colors.fitness} />
          )}
        </Card>
      ) : null}
      <Card>
        <View style={[s.row, { justifyContent: "space-between" }]}>
          <Text style={s.h2}>Today</Text>
          <Button title="Timetable" kind="quiet" onPress={() => go("timetable")} />
        </View>
        {classes.length ? (
          classes.map((c) => (
            <ListRow
              key={c.key}
              colour={subjectColour(
                data.subjects.find((x) => x.id === c.subjectId),
              )}
              title={c.title}
              subtitle={`${clock(c.start)} – ${clock(c.end)}${c.room ? ` · ${c.room}` : ""} · ${c.kind}`}
              right={
                c.status === "Scheduled" ? undefined : (
                  <Tag text={c.status.toUpperCase()} color={colors.fitness} />
                )
              }
            />
          ))
        ) : (
          <Empty
            text={
              order.order
                ? "No registered classes fall on this Day Order. The whole day is yours."
                : "No classes today."
            }
          />
        )}
        {gaps.length ? (
          <Text style={[s.muted, { fontSize: 11 }]}>
            Free between classes:{" "}
            {gaps.map((g) => `${clock(g.start)}–${clock(g.end)}`).join(" · ")} ·
            Using them for {data.settings.freePeriods.toLowerCase()}
          </Text>
        ) : null}
      </Card>
      <Card>
        <View style={[s.row, { justifyContent: "space-between" }]}>
          <Text style={s.h2}>Deadline radar</Text>
          <Button
            title="All deadlines"
            kind="quiet"
            onPress={() => go("assignments")}
          />
        </View>
        {due.length ? (
          due
            .slice(0, 5)
            .map((d) => (
              <ListRow
                key={d.id}
                colour={
                  d.days < 0
                    ? "#FF9C9C"
                    : d.days <= 1
                      ? colors.fitness
                      : d.days <= 3
                        ? colors.accent
                        : colors.muted
                }
                title={d.title}
                subtitle={`${displayName(data.subjects.find((x) => x.id === d.subjectId))} · ${d.kind} · ${
                  d.days < 0
                    ? `${-d.days} day${d.days === -1 ? "" : "s"} overdue`
                    : d.days === 0
                      ? "today"
                      : d.days === 1
                        ? "tomorrow"
                        : `in ${d.days} days`
                }`}
                right={
                  <Text style={s.muted}>
                    {d.remaining ? duration(d.remaining) : "ready"}
                  </Text>
                }
                onPress={() =>
                  go(d.kind === "Assignment" ? "assignments" : "assessments")
                }
              />
            ))
        ) : (
          <Empty text="Nothing due. A good moment to get ahead." />
        )}
      </Card>
      <Card>
        <View style={[s.row, { justifyContent: "space-between" }]}>
          <Text style={s.h2}>Study today</Text>
          <Button title="Study plan" kind="quiet" onPress={() => go("study")} />
        </View>
        {study.length ? (
          study.map((x) => (
            <ListRow
              key={x.id}
              colour={subjectColour(
                data.subjects.find((v) => v.id === x.subjectId),
              )}
              title={x.title}
              subtitle={`${x.detail} · ${x.reason}`}
              right={<Text style={s.muted}>{duration(x.minutes)}</Text>}
              onPress={() => go("study")}
            />
          ))
        ) : (
          <Empty text="Add syllabus topics or an assignment and suggestions appear here." />
        )}
      </Card>
      {attention.length ? (
        <Card>
          <Text style={s.h2}>Needs attention</Text>
          {attention.slice(0, 6).map((r) => (
            <ListRow
              key={r.id}
              colour={r.tone === "warn" ? "#FF9C9C" : colors.accent}
              title={r.title}
              subtitle={r.detail}
            />
          ))}
        </Card>
      ) : null}
      <Card>
        <Text style={s.h2}>Academic progress</Text>
        <View style={s.wrap}>
          <Stat
            label="Assignments"
            value={`${data.assignments.length - openAssignments} / ${data.assignments.length}`}
            hint="submitted"
            color={colors.academic}
          />
          <Stat
            label="Syllabus"
            value={`${progress.overall}%`}
            hint={`${progress.covered}% covered in class`}
            color={colors.diet}
          />
          <Stat
            label="Attendance"
            value={held ? `${Math.round((attended / held) * 100)}%` : "—"}
            hint={held ? `${attended} of ${held} hours` : "not logged yet"}
            color={colors.skills}
          />
          <Stat
            label="Tests"
            value={String(
              data.assessments.filter((a) => a.date >= today).length,
            )}
            hint="upcoming"
            color={colors.fitness}
          />
        </View>
        <Progress value={progress.overall} color={colors.diet} />
      </Card>
      <Card>
        <Text style={s.h2}>Everything academic</Text>
        <View style={s.wrap}>
          {sections.map(([id, title, icon]) => (
            <Pressable
              key={id}
              accessibilityRole="button"
              accessibilityLabel={title}
              onPress={() => go(id)}
              style={({ pressed }) => ({
                flexGrow: 1,
                flexBasis: 140,
                backgroundColor: colors.raised,
                borderRadius: 14,
                padding: 14,
                gap: 9,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Icon name={icon} size={18} color={colors.academic} />
              <Text style={{ color: colors.text, fontSize: 13, fontWeight: "600" }}>
                {title}
              </Text>
            </Pressable>
          ))}
        </View>
      </Card>
      {override && (
        <Editor
          title="Day Order for a date"
          initial={{
            date: today,
            type: "Manual Override",
            dayOrder: String(order.order ?? 1),
            note: "",
          }}
          fields={[
            { key: "date", label: "Date · YYYY-MM-DD" },
            {
              key: "type",
              label: "Day type",
              options: [
                "Manual Override",
                "Academic Day",
                "Special Timetable",
                "Special Working Day",
                "Holiday",
                "No Class",
                "Exam Day",
                "College Event",
              ],
            },
            {
              key: "dayOrder",
              label: "Day Order (working days only)",
              options: ["1", "2", "3", "4", "5"],
            },
            { key: "note", label: "Note" },
          ]}
          onSave={(v) =>
            act(
              (e) =>
                e.setDayOrder(
                  v.date!,
                  Number(v.dayOrder) || null,
                  v.type!,
                  v.note ?? "",
                ),
              "Day Order updated",
            )
          }
          onClose={() => setOverride(false)}
        />
      )}
    </>
  );
}

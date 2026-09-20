import React, { useState } from "react";
import { Text, View, Pressable } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Shell } from "../../src/ui/Shell";
import {
  Card,
  Button,
  Editor,
  Tag,
  Empty,
  Heading,
  Progress,
  Stat,
  ListRow,
} from "../../src/ui/components";
import { styles as s, colors } from "../../src/ui/theme";
import { useLife } from "../../src/state/store";
import { activeClasses, subjectColour } from "../../src/domain/timetable";
import {
  assignmentOpen,
  assignmentRemaining,
  awaitingSubmission,
  subjectAttendance,
  subjectMarks,
  subjectTopics,
  syllabusProgress,
} from "../../src/domain/academic";
import { addDays, clock, dateKey, daysBetween, duration, uid } from "../../src/domain/time";
export default function SubjectPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, act } = useLife(),
    router = useRouter(),
    today = dateKey();
  const [todo, setTodo] = useState<any>(null);
  const subject = data.subjects.find((x) => x.id === id);
  if (!subject)
    return (
      <Shell>
        <Heading title="Subject" />
        <Card>
          <Empty text="This subject no longer exists." />
        </Card>
      </Shell>
    );
  const colour = subjectColour(subject);
  const slots = data.courseSlots.filter((c) => c.subjectId === subject.id);
  const theory = slots.filter((c) => c.kind === "Theory");
  const practical = slots.filter((c) => c.kind !== "Theory");
  const topics = subjectTopics(data, subject.id);
  const progress = syllabusProgress(topics);
  const attendance = subjectAttendance(data, subject.id);
  const marks = subjectMarks(data, subject.id);
  const assignments = data.assignments.filter((a) => a.subjectId === subject.id);
  const openAssignments = assignments.filter(assignmentOpen);
  const assessments = data.assessments
    .filter((a) => a.subjectId === subject.id && a.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date));
  const todos = data.subjectTodos.filter((t) => t.subjectId === subject.id);
  const announcements = data.announcements
    .filter((a) => a.subjectId === subject.id && !a.archived)
    .sort((a, b) => b.date.localeCompare(a.date));
  const units = data.syllabusUnits
    .filter((u) => u.subjectId === subject.id)
    .sort((a, b) => a.position - b.position);
  let upcoming: { date: string; start: number; room: string } | null = null;
  for (let i = 0; i < 14 && !upcoming; i++) {
    const date = addDays(today, i);
    const found = activeClasses(data, date).find(
      (c) => c.subjectId === subject.id && (i > 0 || c.end > 0),
    );
    if (found)
      upcoming = { date, start: found.start, room: found.room };
  }
  const go = (section: string) =>
    router.push({ pathname: "/academic/[section]", params: { section } });
  return (
    <Shell>
      <Heading
        title={subject.title}
        subtitle={`${subject.code} · ${subject.credits} credit${subject.credits === 1 ? "" : "s"} · ${subject.facultyName || "No faculty recorded"}`}
      />
      <Card style={{ borderTopColor: colour, borderTopWidth: 3 }}>
        <View style={s.wrap}>
          <Tag text={subject.category.toUpperCase()} color={colour} />
          <Tag text={subject.courseType.toUpperCase()} color={colors.muted} />
        </View>
        <Text style={s.muted}>
          {theory.length
            ? `Theory: ${theory.map((c) => c.slotCode).join(" · ")}${theory[0]!.room ? ` · ${theory[0]!.room}` : ""}`
            : "No theory slot"}
          {practical.length
            ? `    ${practical[0]!.kind}: ${practical.map((c) => c.slotCode).join(" · ")}${practical[0]!.room ? ` · ${practical[0]!.room}` : ""}`
            : ""}
        </Text>
        {upcoming ? (
          <>
            <Text style={s.label}>NEXT CLASS</Text>
            <Text style={[s.h2, { fontSize: 21 }]}>
              {upcoming.date === today
                ? "Today"
                : upcoming.date === addDays(today, 1)
                  ? "Tomorrow"
                  : upcoming.date}{" "}
              · {clock(upcoming.start)}
              {upcoming.room ? ` · ${upcoming.room}` : ""}
            </Text>
          </>
        ) : (
          <Text style={s.muted}>No class in the next two weeks.</Text>
        )}
      </Card>
      <Card>
        <View style={[s.row, { justifyContent: "space-between" }]}>
          <Text style={s.h2}>Syllabus</Text>
          <Button title="Open" kind="quiet" onPress={() => go("syllabus")} />
        </View>
        {units.length ? (
          units.map((unit) => {
            const p = syllabusProgress(topics.filter((t) => t.unitId === unit.id));
            return (
              <View key={unit.id} style={{ gap: 6 }}>
                <View style={[s.row, { justifyContent: "space-between" }]}>
                  <Text style={s.text}>{unit.title}</Text>
                  <Text style={s.muted}>{p.overall}%</Text>
                </View>
                <Progress value={p.overall} color={colour} />
              </View>
            );
          })
        ) : (
          <Empty text="No units yet." />
        )}
        <View style={s.wrap}>
          <Stat label="Overall" value={`${progress.overall}%`} color={colour} />
          <Stat
            label="Class covered"
            value={`${progress.covered}%`}
            color={colors.muted}
          />
          <Stat
            label="You studied"
            value={`${progress.studied}%`}
            color={colors.diet}
          />
        </View>
      </Card>
      <Card>
        <View style={[s.row, { justifyContent: "space-between" }]}>
          <Text style={s.h2}>Assignments</Text>
          <Button title="Open" kind="quiet" onPress={() => go("assignments")} />
        </View>
        <View style={s.wrap}>
          <Stat
            label="Pending"
            value={String(openAssignments.length)}
            color={openAssignments.length ? colors.fitness : colors.muted}
          />
          <Stat
            label="Completed"
            value={String(assignments.length - openAssignments.length)}
            color={colour}
          />
        </View>
        {openAssignments
          .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
          .map((a) => (
            <ListRow
              key={a.id}
              colour={awaitingSubmission(a) ? "#FF9C9C" : colour}
              title={a.title}
              subtitle={`due ${a.dueDate} · ${a.progress}%${awaitingSubmission(a) ? " · finished but not submitted" : ""}`}
              right={
                <Text style={s.muted}>
                  {assignmentRemaining(a) ? duration(assignmentRemaining(a)) : "done"}
                </Text>
              }
              onPress={() => go("assignments")}
            />
          ))}
        {!assignments.length && <Text style={s.muted}>Nothing set yet.</Text>}
      </Card>
      <Card>
        <View style={[s.row, { justifyContent: "space-between" }]}>
          <Text style={s.h2}>Tests</Text>
          <Button title="Open" kind="quiet" onPress={() => go("assessments")} />
        </View>
        {assessments.length ? (
          assessments.map((a) => (
            <ListRow
              key={a.id}
              colour={colour}
              title={`${a.title} · ${a.assessmentType}`}
              subtitle={`${a.date} · ${clock(a.startTime)}${a.room ? ` · ${a.room}` : ""}`}
              right={
                <Text style={s.muted}>
                  {daysBetween(today, a.date) === 0
                    ? "today"
                    : `${daysBetween(today, a.date)}d`}
                </Text>
              }
              onPress={() => go("assessments")}
            />
          ))
        ) : (
          <Text style={s.muted}>None scheduled.</Text>
        )}
      </Card>
      <Card>
        <View style={[s.row, { justifyContent: "space-between" }]}>
          <Text style={s.h2}>Attendance</Text>
          <Button title="Mark" kind="quiet" onPress={() => go("attendance")} />
        </View>
        {attendance.held ? (
          <>
            <Text
              style={{
                color: attendance.atRisk ? "#FF9C9C" : colour,
                fontSize: 32,
                fontWeight: "700",
              }}
            >
              {attendance.percentage}%
            </Text>
            <View style={s.wrap}>
              <Stat label="Present" value={String(attendance.present)} />
              <Stat label="Absent" value={String(attendance.absent)} />
              <Stat label="OD" value={String(attendance.od)} />
              <Stat
                label="Room to miss"
                value={String(attendance.canMiss)}
                hint={`at ${data.settings.attendanceThreshold}%`}
              />
            </View>
          </>
        ) : (
          <Text style={s.muted}>No hours recorded yet.</Text>
        )}
      </Card>
      <Card>
        <Text style={s.h2}>To do</Text>
        {todos.length ? (
          todos.map((t) => (
            <Pressable
              key={t.id}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: !!t.done }}
              accessibilityLabel={t.title}
              onPress={() =>
                void act((e) =>
                  e.saveTodo({ ...t, done: t.done ? 0 : 1 }, !!t.taskId),
                )
              }
              style={[s.row, { gap: 10 }]}
            >
              <View
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 6,
                  borderWidth: 1,
                  borderColor: colors.border,
                  backgroundColor: t.done ? colour : "transparent",
                }}
              />
              <View style={s.grow}>
                <Text
                  style={[
                    s.text,
                    t.done ? { color: colors.muted, textDecorationLine: "line-through" } : null,
                  ]}
                >
                  {t.title}
                </Text>
                {t.taskId ? (
                  <Text style={[s.muted, { fontSize: 11 }]}>Scheduled in LifeOS</Text>
                ) : null}
              </View>
              <Button
                title="Edit"
                kind="quiet"
                icon="edit-2"
                onPress={() => setTodo(t)}
              />
            </Pressable>
          ))
        ) : (
          <Empty text="Nothing on the list for this subject." />
        )}
        <Button
          title="Add todo"
          kind="secondary"
          icon="plus"
          onPress={() =>
            setTodo({
              id: uid(),
              subjectId: subject.id,
              title: "",
              done: 0,
              taskId: null,
              createdAt: new Date().toISOString(),
              notes: "",
              schedule: "Yes",
            })
          }
        />
      </Card>
      {announcements.length ? (
        <Card>
          <Text style={s.h2}>Announcements</Text>
          {announcements.slice(0, 6).map((a) => (
            <ListRow
              key={a.id}
              colour={a.pinned ? colors.accent : colour}
              title={a.title}
              subtitle={`${a.date}${a.body ? ` · ${a.body}` : ""}`}
              onPress={() => go("announcements")}
            />
          ))}
        </Card>
      ) : null}
      {marks.rows.length ? (
        <Card>
          <View style={[s.row, { justifyContent: "space-between" }]}>
            <Text style={s.h2}>Marks</Text>
            <Button title="Open" kind="quiet" onPress={() => go("marks")} />
          </View>
          {marks.rows.map((row) => (
            <ListRow
              key={row.id}
              title={row.component}
              subtitle={row.weightage ? `${row.weightage} weightage` : "not weighted"}
              right={
                <Text style={s.text}>
                  {row.obtained} / {row.maximum}
                </Text>
              }
            />
          ))}
        </Card>
      ) : null}
      {todo && (
        <Editor
          title="Subject todo"
          initial={todo}
          fields={[
            { key: "title", label: "What needs doing" },
            {
              key: "schedule",
              label: "Schedule it as a LifeOS task",
              options: ["Yes", "No"],
            },
            { key: "notes", label: "Notes", type: "multiline" },
          ]}
          onSave={(v) =>
            act(
              (e) =>
                e.saveTodo(
                  {
                    id: todo.id,
                    subjectId: subject.id,
                    title: v.title,
                    done: todo.done ?? 0,
                    taskId: todo.taskId ?? null,
                    createdAt: todo.createdAt,
                    notes: v.notes ?? "",
                  },
                  v.schedule === "Yes",
                ),
              "Todo saved",
            )
          }
          onDelete={() =>
            act(async (e) => {
              await e.repo.remove("subjectTodos", todo.id);
              if (todo.taskId) await e.repo.remove("tasks", todo.taskId);
            })
          }
          onClose={() => setTodo(null)}
        />
      )}
    </Shell>
  );
}

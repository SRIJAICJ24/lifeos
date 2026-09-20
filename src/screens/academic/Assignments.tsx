import React, { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { useLife } from "../../state/store";
import {
  Card,
  Button,
  Editor,
  Tag,
  Empty,
  Progress,
  Segmented,
} from "../../ui/components";
import { styles as s, colors } from "../../ui/theme";
import { subjectColour } from "../../domain/timetable";
import {
  assignmentOpen,
  assignmentRemaining,
  awaitingSubmission,
  displayName,
} from "../../domain/academic";
import { addDays, dateKey, daysBetween, duration, uid } from "../../domain/time";
const urgencyColour = (days: number) =>
  days < 0
    ? "#FF9C9C"
    : days === 0
      ? colors.fitness
      : days <= 1
        ? colors.fitness
        : days <= 3
          ? colors.accent
          : colors.muted;
const whenLabel = (days: number) =>
  days < 0
    ? `${-days} day${days === -1 ? "" : "s"} overdue`
    : days === 0
      ? "Due today"
      : days === 1
        ? "Due tomorrow"
        : `Due in ${days} days`;
export function Assignments({ startNew = false }: { startNew?: boolean }) {
  const { data, act } = useLife(),
    today = dateKey();
  const [edit, setEdit] = useState<any>(null);
  const [view, setView] = useState("Open");
  const subject = (id: string) => data.subjects.find((x) => x.id === id);
  const blank = () => ({
    id: uid(),
    subjectId: data.subjects[0]?.id ?? "",
    subjectTitle: data.subjects[0]?.title ?? "",
    title: "",
    description: "",
    assignedDate: today,
    dueDate: addDays(today, 3),
    dueTime: "23:59",
    estimatedDuration: 60,
    priority: 2,
    maximumMarks: 0,
    awardedMarks: -1,
    submissionType: "Upload",
    submissionLocation: "",
    status: "Not started",
    progress: 0,
    attachments: "",
    notes: "",
    facultyInstructions: "",
    submittedAt: "",
    submissionConfirmed: 0,
    taskId: null,
  });
  const open = data.assignments.filter(assignmentOpen);
  const list =
    view === "Open"
      ? open.sort((a, b) => a.dueDate.localeCompare(b.dueDate))
      : view === "Awaiting submission"
        ? data.assignments.filter(awaitingSubmission)
        : data.assignments
            .filter((a) => !assignmentOpen(a))
            .sort((a, b) => b.dueDate.localeCompare(a.dueDate));
  const bands = [
    { label: "Overdue", items: open.filter((a) => daysBetween(today, a.dueDate) < 0) },
    { label: "Due today", items: open.filter((a) => a.dueDate === today) },
    {
      label: "Tomorrow",
      items: open.filter((a) => daysBetween(today, a.dueDate) === 1),
    },
    {
      label: "This week",
      items: open.filter(
        (a) =>
          daysBetween(today, a.dueDate) > 1 && daysBetween(today, a.dueDate) <= 7,
      ),
    },
    {
      label: "Later",
      items: open.filter((a) => daysBetween(today, a.dueDate) > 7),
    },
  ].filter((b) => b.items.length);
  const card = (a: (typeof data.assignments)[number]) => {
    const days = daysBetween(today, a.dueDate);
    const remaining = assignmentRemaining(a);
    return (
      <Card key={a.id}>
        <View style={[s.row, { justifyContent: "space-between" }]}>
          <Tag
            text={displayName(subject(a.subjectId)).toUpperCase()}
            color={subjectColour(subject(a.subjectId))}
          />
          <Tag text={a.status.toUpperCase()} color={urgencyColour(days)} />
        </View>
        <Text style={[s.h2, { fontSize: 21 }]}>{a.title}</Text>
        <Text style={s.muted}>
          {whenLabel(days)} · {a.dueDate} {a.dueTime}
          {a.maximumMarks ? ` · ${a.maximumMarks} marks` : ""}
        </Text>
        {a.description ? <Text style={s.muted}>{a.description}</Text> : null}
        <Progress value={a.progress} color={urgencyColour(days)} />
        <Text style={[s.muted, { fontSize: 11 }]}>
          {a.progress}% done ·{" "}
          {remaining ? `about ${duration(remaining)} left` : "work finished"}
          {a.submissionConfirmed
            ? " · submitted"
            : a.progress >= 100
              ? " · not submitted yet"
              : ""}
        </Text>
        {awaitingSubmission(a) && (
          <Card style={{ padding: 14, backgroundColor: "#40282C", gap: 10 }}>
            <Text style={{ color: "#FFB4B4", fontSize: 13 }}>
              Finished, but not submitted. Don't let it stop here.
            </Text>
            <Button
              title="Mark as submitted"
              onPress={() => void act((e) => e.confirmSubmission(a.id, true), "Submission recorded")}
            />
          </Card>
        )}
        <View style={s.wrap}>
          <Button title="Edit" kind="secondary" icon="edit-2" onPress={() => setEdit({ ...a, subjectTitle: subject(a.subjectId)?.title ?? "" })} />
          {!a.submissionConfirmed ? (
            <Button
              title="Mark submitted"
              kind="secondary"
              onPress={() => void act((e) => e.confirmSubmission(a.id, true), "Submission recorded")}
            />
          ) : (
            <Button
              title="Undo submission"
              kind="quiet"
              onPress={() => void act((e) => e.confirmSubmission(a.id, false))}
            />
          )}
        </View>
      </Card>
    );
  };
  // Arriving from a quick action opens the form straight away.
  useEffect(() => {
    if (startNew && data.subjects.length) setEdit(blank());
  }, []);
  return (
    <>
      <Button
        title="New assignment"
        icon="plus"
        onPress={() =>
          data.subjects.length
            ? setEdit(blank())
            : void act(async () => {
                throw new Error("Add a subject before creating assignments.");
              })
        }
      />
      <Segmented
        values={["Open", "Awaiting submission", "Done"]}
        value={view}
        onChange={setView}
      />
      {view === "Open" && bands.length ? (
        bands.map((band) => (
          <View key={band.label} style={{ gap: 16 }}>
            <Text style={s.label}>{band.label.toUpperCase()}</Text>
            {band.items.map(card)}
          </View>
        ))
      ) : list.length ? (
        list.map(card)
      ) : (
        <Card>
          <Empty
            text={
              view === "Open"
                ? "Nothing pending. Enjoy the clear runway."
                : view === "Awaiting submission"
                  ? "Nothing finished-but-unsubmitted. Good."
                  : "No completed assignments yet."
            }
          />
        </Card>
      )}
      {edit && (
        <Editor
          title="Assignment"
          initial={edit}
          fields={[
            { key: "title", label: "Title" },
            {
              key: "subjectTitle",
              label: "Subject",
              options: data.subjects.map((x) => x.title),
            },
            { key: "description", label: "What is being asked", type: "multiline" },
            { key: "assignedDate", label: "Given on · YYYY-MM-DD" },
            { key: "dueDate", label: "Due · YYYY-MM-DD" },
            { key: "dueTime", label: "Due time · HH:mm" },
            {
              key: "estimatedDuration",
              label: "Estimated minutes of work",
              type: "number",
            },
            { key: "progress", label: "Progress %", type: "number" },
            {
              key: "priority",
              label: "Priority",
              options: ["1", "2", "3"],
            },
            {
              key: "status",
              label: "Status",
              options: [
                "Not started",
                "Planning",
                "In progress",
                "Ready to submit",
                "Submitted",
                "Graded",
                "Late",
                "Missed",
              ],
            },
            { key: "maximumMarks", label: "Marks available", type: "number" },
            {
              key: "submissionType",
              label: "Submission",
              options: ["Upload", "Hard copy", "In class", "Email", "Other"],
            },
            { key: "submissionLocation", label: "Where to submit" },
            { key: "facultyInstructions", label: "Faculty instructions", type: "multiline" },
            { key: "notes", label: "Notes", type: "multiline" },
          ]}
          onSave={(v) =>
            act((e) => {
              const found = data.subjects.find((x) => x.title === v.subjectTitle);
              if (!found) throw new Error("Choose a subject.");
              return e.saveAssignment({
                ...edit,
                ...v,
                subjectId: found.id,
                estimatedDuration: Number(v.estimatedDuration) || 30,
                progress: Math.min(100, Math.max(0, Number(v.progress) || 0)),
                priority: Number(v.priority) || 2,
                maximumMarks: Number(v.maximumMarks) || 0,
              });
            }, "Assignment saved — it is on Today too")
          }
          onDelete={() =>
            act(async (e) => {
              await e.repo.remove("assignments", edit.id);
              if (edit.taskId) await e.repo.remove("tasks", edit.taskId);
            })
          }
          onClose={() => setEdit(null)}
        />
      )}
    </>
  );
}

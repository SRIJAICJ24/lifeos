import React, { useState } from "react";
import { View, Text } from "react-native";
import { useLife } from "../state/store";
import {
  Card,
  Button,
  Editor,
  Choices,
  Progress,
  Tag,
  Empty,
} from "../ui/components";
import { styles as s, colors } from "../ui/theme";
import { uid, duration, dateKey } from "../domain/time";
import { newTask } from "../data/seed";
import { TaskRow } from "../ui/TaskRow";
export function Learning({ kind }: { kind: "skills" | "projects" }) {
  const { data, act } = useLife();
  const [selected, setSelected] = useState("All"),
    [edit, setEdit] = useState<any>(null),
    [topic, setTopic] = useState<string | null>(null),
    [taskOwner, setTaskOwner] = useState<string | null>(null);
  const rows = kind === "skills" ? data.skills : data.projects;
  const create = () =>
    setEdit(
      kind === "skills"
        ? {
            id: uid(),
            title: "",
            notes: "",
            resource: "",
            questions: 0,
            nextRevision: null,
          }
        : {
            id: uid(),
            title: "",
            description: "",
            status: "Idea",
            targetDate: null,
            link: "",
            notes: "",
          },
    );
  return (
    <>
      <View
        style={[s.row, { justifyContent: "space-between", flexWrap: "wrap" }]}
      >
        {kind === "projects" ? (
          <Choices
            values={["All", "Idea vault", "Active"]}
            value={selected}
            onChange={setSelected}
          />
        ) : (
          <Text style={s.muted}>Learn. Practice. Come back to it.</Text>
        )}
        <Button
          title={kind === "skills" ? "Add skill" : "New project"}
          icon="plus"
          onPress={create}
        />
      </View>
      {rows
        .filter(
          (r) =>
            kind === "skills" ||
            selected === "All" ||
            (selected === "Idea vault"
              ? (r as any).status === "Idea"
              : (r as any).status !== "Idea"),
        )
        .map((row) => {
          const topics = data.topics.filter((t) => t.ownerId === row.id);
          const tasks = data.tasks.filter((t) =>
            kind === "skills" ? t.skillId === row.id : t.projectId === row.id,
          );
          const minutes = data.sessions
            .filter((s) => tasks.some((t) => t.id === s.taskId))
            .reduce((n, s) => n + s.actual, 0);
          return (
            <Card key={row.id}>
              <View style={[s.row, { justifyContent: "space-between" }]}>
                <View style={{ gap: 10 }}>
                  <Tag
                    text={
                      kind === "skills"
                        ? "LEARNING PATH"
                        : (row as any).status.toUpperCase()
                    }
                    color={colors[kind]}
                  />
                  <Text style={[s.h2, { fontSize: 26 }]}>{row.title}</Text>
                </View>
                <Button
                  title={`Edit ${row.title}`}
                  kind="quiet"
                  icon="edit-2"
                  onPress={() => setEdit(row)}
                />
              </View>
              {"description" in row && (
                <Text style={s.muted}>{row.description}</Text>
              )}
              <View style={[s.row, { justifyContent: "space-between" }]}>
                <Text style={s.muted}>
                  {topics.filter((t) => t.done).length}/{topics.length}{" "}
                  {kind === "skills" ? "topics" : "milestones"} complete
                </Text>
                <Text style={s.muted}>{duration(minutes)} invested</Text>
              </View>
              <Progress
                value={
                  topics.length
                    ? (topics.filter((t) => t.done).length / topics.length) *
                      100
                    : 0
                }
                color={colors[kind]}
              />
              <View style={s.wrap}>
                {topics.map((t) => (
                  <Button
                    key={t.id}
                    title={`${t.done ? "✓" : "○"} ${t.title}`}
                    kind="secondary"
                    onPress={() =>
                      void act((e) =>
                        e.save("topics", { ...t, done: t.done ? 0 : 1 }),
                      )
                    }
                  />
                ))}
              </View>
              <Button
                title={kind === "skills" ? "Add topic" : "Add milestone"}
                kind="quiet"
                icon="plus"
                onPress={() => setTopic(row.id)}
              />
              {"questions" in row && (
                <>
                  <Text style={s.muted}>
                    {row.questions} questions solved · Next revision{" "}
                    {row.nextRevision ?? "not set"}
                  </Text>
                  <Button
                    title="Log a solved question"
                    kind="quiet"
                    onPress={() =>
                      void act((e) =>
                        e.save("skills", {
                          ...row,
                          questions: row.questions + 1,
                        }),
                      )
                    }
                  />
                </>
              )}
              {row.notes && <Text style={s.muted}>{row.notes}</Text>}
              {("resource" in row ? row.resource : row.link) ? (
                <Text selectable style={{ color: colors[kind], fontSize: 13 }}>
                  {"resource" in row ? row.resource : row.link}
                </Text>
              ) : null}
              {tasks.map((t) => (
                <TaskRow key={t.id} task={t} />
              ))}
              <Button
                title="Add linked task"
                kind="secondary"
                icon="plus"
                onPress={() => setTaskOwner(row.id)}
              />
            </Card>
          );
        })}
      {!rows.length && (
        <Empty
          text={
            kind === "skills"
              ? "What would you love to learn? Add your first skill."
              : "Every project starts as an idea. Capture yours."
          }
        />
      )}
      {edit && (
        <Editor
          title={kind === "skills" ? "Skill details" : "Project details"}
          initial={edit}
          fields={
            kind === "skills"
              ? [
                  { key: "title", label: "Skill name" },
                  { key: "resource", label: "Resource URL" },
                  { key: "nextRevision", label: "Next revision · YYYY-MM-DD" },
                  {
                    key: "questions",
                    label: "Questions solved",
                    type: "number",
                  },
                  { key: "notes", label: "Notes", type: "multiline" },
                ]
              : [
                  { key: "title", label: "Project name" },
                  {
                    key: "description",
                    label: "Description",
                    type: "multiline",
                  },
                  {
                    key: "status",
                    label: "Stage",
                    options: [
                      "Idea",
                      "Research",
                      "Planning",
                      "Building",
                      "Testing",
                      "Released",
                      "Maintenance",
                    ],
                  },
                  { key: "targetDate", label: "Target date · YYYY-MM-DD" },
                  { key: "link", label: "Project URL" },
                  { key: "notes", label: "Notes", type: "multiline" },
                ]
          }
          onSave={(v) =>
            act((e) =>
              e.save(
                kind,
                kind === "skills"
                  ? {
                      ...edit,
                      ...v,
                      questions: Number(v.questions),
                      nextRevision: v.nextRevision || null,
                    }
                  : { ...edit, ...v, targetDate: v.targetDate || null },
              ),
            )
          }
          onDelete={() => act((e) => e.repo.remove(kind, edit.id))}
          onClose={() => setEdit(null)}
        />
      )}
      {topic && (
        <Editor
          title={kind === "skills" ? "Add topic" : "Add milestone"}
          fields={[{ key: "title", label: "Title" }]}
          initial={{ title: "" }}
          onSave={(v) =>
            act((e) =>
              e.save("topics", {
                id: uid(),
                title: v.title,
                ownerId: topic,
                ownerType: kind === "skills" ? "skill" : "project",
                done: 0,
              }),
            )
          }
          onClose={() => setTopic(null)}
        />
      )}
      {taskOwner && (
        <Editor
          title="Add task to Life Engine"
          fields={[
            { key: "title", label: "Task title" },
            { key: "estimatedDuration", label: "Minutes", type: "number" },
            { key: "deadline", label: "Deadline · YYYY-MM-DD (optional)" },
          ]}
          initial={{ title: "", estimatedDuration: 30, deadline: "" }}
          onSave={(v) =>
            act((e) =>
              e.save("tasks", {
                ...newTask(v.title!, kind, uid()),
                skillId: kind === "skills" ? taskOwner : null,
                projectId: kind === "projects" ? taskOwner : null,
                estimatedDuration: Number(v.estimatedDuration),
                minimumSessionLength: Math.min(15, Number(v.estimatedDuration)),
                deadline: v.deadline || null,
              }),
            )
          }
          onClose={() => setTaskOwner(null)}
        />
      )}
    </>
  );
}

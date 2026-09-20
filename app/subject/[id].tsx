import React, { useState } from "react";
import { View, Text } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Shell } from "../../src/ui/Shell";
import {
  Heading,
  Card,
  Button,
  Editor,
  Progress,
  Empty,
} from "../../src/ui/components";
import { styles as s, colors } from "../../src/ui/theme";
import { useLife } from "../../src/state/store";
import { uid } from "../../src/domain/time";
import { TaskRow } from "../../src/ui/TaskRow";
export default function SubjectPage() {
  const { id } = useLocalSearchParams<{ id: string }>(),
    { data, act } = useLife(),
    router = useRouter();
  const subject = data.subjects.find((s) => s.id === id);
  const [edit, setEdit] = useState(false),
    [topic, setTopic] = useState(false);
  if (!subject)
    return (
      <Shell>
        <Empty text="Subject not found." />
      </Shell>
    );
  const topics = data.topics.filter((t) => t.ownerId === id);
  return (
    <Shell>
      <Heading
        title={subject.title}
        subtitle="A little progress, every study session."
        right={
          <Button
            title="Edit subject"
            kind="secondary"
            onPress={() => setEdit(true)}
          />
        }
      />
      <View style={s.grid}>
        <Card style={s.column}>
          <Text style={s.h2}>Attendance</Text>
          <Text style={{ fontSize: 42, color: colors.academic }}>
            {subject.total
              ? Math.round((subject.attended / subject.total) * 100) + "%"
              : "—"}
          </Text>
          <Text style={s.muted}>
            {subject.attended} attended / {subject.total} classes recorded
          </Text>
          <View style={s.wrap}>
            <Button
              title="Attended"
              onPress={() =>
                void act((e) =>
                  e.save("subjects", {
                    ...subject,
                    attended: subject.attended + 1,
                    total: subject.total + 1,
                  }),
                )
              }
            />
            <Button
              title="Absent"
              kind="secondary"
              onPress={() =>
                void act((e) =>
                  e.save("subjects", { ...subject, total: subject.total + 1 }),
                )
              }
            />
          </View>
        </Card>
        <Card style={s.column}>
          <Text style={s.h2}>Syllabus & revision</Text>
          <Progress
            value={
              topics.length
                ? (topics.filter((t) => t.done).length / topics.length) * 100
                : 0
            }
            color={colors.academic}
          />
          {topics.map((t) => (
            <Button
              key={t.id}
              title={`${t.done ? "✓" : "○"} ${t.title}`}
              kind="quiet"
              onPress={() =>
                void act((e) =>
                  e.save("topics", { ...t, done: t.done ? 0 : 1 }),
                )
              }
            />
          ))}
          <Button
            title="Add topic"
            icon="plus"
            kind="secondary"
            onPress={() => setTopic(true)}
          />
        </Card>
      </View>
      <Card>
        <Text style={s.h2}>Academic work</Text>
        {data.tasks
          .filter((t) => t.subjectId === id)
          .map((t) => (
            <TaskRow key={t.id} task={t} />
          ))}
        <Button
          title="Add assignment / exam"
          kind="secondary"
          onPress={() => router.push("/capture")}
        />
      </Card>
      <Card>
        <Text style={s.h2}>Marks & notes</Text>
        <Text style={s.text}>{subject.marks || "No marks recorded."}</Text>
        <Text style={s.muted}>
          {subject.notes || "Keep useful context for the next study session."}
        </Text>
      </Card>
      {edit && (
        <Editor
          title="Edit subject"
          initial={subject}
          fields={[
            { key: "title", label: "Name" },
            { key: "code", label: "Code" },
            { key: "attended", label: "Attended classes", type: "number" },
            { key: "total", label: "Total classes", type: "number" },
            { key: "marks", label: "Marks", type: "multiline" },
            { key: "notes", label: "Notes", type: "multiline" },
          ]}
          onSave={(v) =>
            act((e) => {
              if (
                Number(v.attended) > Number(v.total) ||
                Number(v.attended) < 0
              )
                throw new Error(
                  "Attendance must be between 0 and total classes.",
                );
              return e.save("subjects", {
                ...subject,
                ...v,
                attended: Number(v.attended),
                total: Number(v.total),
              });
            })
          }
          onDelete={async () => {
            const ok = await act((e) => e.repo.remove("subjects", id));
            if (ok) router.replace("/area/academic");
            return ok;
          }}
          onClose={() => setEdit(false)}
        />
      )}
      {topic && (
        <Editor
          title="Add syllabus topic"
          initial={{ title: "" }}
          fields={[{ key: "title", label: "Topic" }]}
          onSave={(v) =>
            act((e) =>
              e.save("topics", {
                id: uid(),
                ownerId: id,
                ownerType: "subject",
                title: v.title,
                done: 0,
              }),
            )
          }
          onClose={() => setTopic(false)}
        />
      )}
    </Shell>
  );
}

import React, { useState } from "react";
import { Text, View, Pressable } from "react-native";
import { useLife } from "../../state/store";
import {
  Card,
  Button,
  Editor,
  Tag,
  Empty,
  Progress,
  Stat,
  Segmented,
} from "../../ui/components";
import { styles as s, colors } from "../../ui/theme";
import { subjectColour } from "../../domain/timetable";
import { displayName, syllabusProgress } from "../../domain/academic";
import { topicStates, TopicState } from "../../domain/types";
import { uid } from "../../domain/time";
const stateColour = (state: TopicState) =>
  state === "Mastered"
    ? colors.accent
    : state === "Revised"
      ? colors.diet
      : state === "Practised"
        ? colors.academic
        : state === "Understood"
          ? colors.skills
          : state === "Learning"
            ? colors.fitness
            : colors.muted;
export function Syllabus() {
  const { data, act } = useLife();
  const [subjectId, setSubjectId] = useState(data.subjects[0]?.id ?? "");
  const [open, setOpen] = useState<string | null>(null);
  const [edit, setEdit] = useState<any>(null);
  const subject = data.subjects.find((x) => x.id === subjectId);
  if (!data.subjects.length)
    return (
      <Card>
        <Empty text="Add a subject before building its syllabus." />
      </Card>
    );
  const colour = subjectColour(subject);
  const units = data.syllabusUnits
    .filter((u) => u.subjectId === subjectId)
    .sort((a, b) => a.position - b.position);
  const topics = data.syllabusTopics.filter((t) => t.subjectId === subjectId);
  const progress = syllabusProgress(topics);
  const cycle = (t: (typeof topics)[number]) =>
    act((e) =>
      e.setTopicState(
        t.id,
        topicStates[(topicStates.indexOf(t.state) + 1) % topicStates.length]!,
      ),
    );
  return (
    <>
      <Segmented
        values={data.subjects.map((x) => displayName(x))}
        value={displayName(subject)}
        onChange={(v) =>
          setSubjectId(data.subjects.find((x) => displayName(x) === v)?.id ?? "")
        }
      />
      <Card>
        <Text style={s.h2}>{subject?.title}</Text>
        <Text style={s.muted}>
          Class coverage, your own study and your revision are three different
          things. They are tracked separately on purpose.
        </Text>
        <View style={s.wrap}>
          <Stat
            label="Class covered"
            value={`${progress.covered}%`}
            hint="taught so far"
            color={colors.muted}
          />
          <Stat
            label="You studied"
            value={`${progress.studied}%`}
            hint="understood or better"
            color={colour}
          />
          <Stat
            label="Revised"
            value={`${progress.revised}%`}
            hint="been back over it"
            color={colors.diet}
          />
        </View>
        <Progress value={progress.covered} color={colors.border} />
        <Progress value={progress.studied} color={colour} />
        <Progress value={progress.revised} color={colors.diet} />
        <Text style={[s.muted, { fontSize: 11 }]}>
          {topics.length} topics · overall {progress.overall}%
        </Text>
      </Card>
      {units.map((unit) => {
        const unitTopics = topics
          .filter((t) => t.unitId === unit.id && !t.parentId)
          .sort((a, b) => a.position - b.position);
        const unitProgress = syllabusProgress(
          topics.filter((t) => t.unitId === unit.id),
        );
        const expanded = open === unit.id;
        return (
          <Card key={unit.id}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${unit.title}, ${unitProgress.overall}% complete`}
              onPress={() => setOpen(expanded ? null : unit.id)}
            >
              <View style={[s.row, { justifyContent: "space-between" }]}>
                <View style={s.grow}>
                  <Text style={s.h2}>{unit.title}</Text>
                  {unit.description ? (
                    <Text style={s.muted}>{unit.description}</Text>
                  ) : null}
                </View>
                <Text style={{ color: colour, fontSize: 19, fontWeight: "700" }}>
                  {unitProgress.overall}%
                </Text>
              </View>
            </Pressable>
            <Progress value={unitProgress.overall} color={colour} />
            {expanded && (
              <>
                {unitTopics.map((t) => {
                  const subtopics = topics
                    .filter((x) => x.parentId === t.id)
                    .sort((a, b) => a.position - b.position);
                  return (
                    <View key={t.id} style={{ gap: 8 }}>
                      <View style={[s.row, { justifyContent: "space-between" }]}>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`${t.title}, ${t.state}. Change state`}
                          onPress={() => void cycle(t)}
                        >
                          <View
                            style={{
                              width: 22,
                              height: 22,
                              borderRadius: 7,
                              borderWidth: 1,
                              borderColor: stateColour(t.state),
                              backgroundColor:
                                t.state === "Not started"
                                  ? "transparent"
                                  : stateColour(t.state) + "55",
                            }}
                          />
                        </Pressable>
                        <Pressable
                          style={s.grow}
                          accessibilityRole="button"
                          accessibilityLabel={`Edit ${t.title}`}
                          onPress={() => setEdit({ kind: "topic", row: t })}
                        >
                          <Text style={s.text}>{t.title}</Text>
                          <Text style={[s.muted, { fontSize: 11 }]}>
                            {t.state}
                            {t.classCovered ? " · covered in class" : ""}
                            {t.revisionCount
                              ? ` · revised ${t.revisionCount}×`
                              : ""}
                            {t.pyqCount ? ` · PYQ ${t.pyqCount}` : ""}
                          </Text>
                        </Pressable>
                        <View style={{ flexDirection: "row", gap: 5 }}>
                          {t.teacherImportant ? (
                            <Tag text="TEACHER" color={colors.fitness} />
                          ) : null}
                          {t.importance >= 2 ? (
                            <Tag text="★★" color={colors.accent} />
                          ) : t.importance === 1 ? (
                            <Tag text="★" color={colors.accent} />
                          ) : null}
                          {t.weak ? <Tag text="WEAK" color="#FF9C9C" /> : null}
                        </View>
                      </View>
                      {subtopics.map((sub) => (
                        <Pressable
                          key={sub.id}
                          accessibilityRole="button"
                          accessibilityLabel={`${sub.title}, ${sub.state}`}
                          onPress={() => void cycle(sub)}
                          style={[s.row, { paddingLeft: 32, gap: 9 }]}
                        >
                          <View
                            style={{
                              width: 14,
                              height: 14,
                              borderRadius: 5,
                              borderWidth: 1,
                              borderColor: stateColour(sub.state),
                              backgroundColor:
                                sub.state === "Not started"
                                  ? "transparent"
                                  : stateColour(sub.state) + "55",
                            }}
                          />
                          <Text style={[s.muted, s.grow]}>{sub.title}</Text>
                          <Text style={[s.muted, { fontSize: 10 }]}>
                            {sub.state}
                          </Text>
                        </Pressable>
                      ))}
                      <View style={[s.wrap, { paddingLeft: 32 }]}>
                        <Button
                          title="Add subtopic"
                          kind="quiet"
                          onPress={() =>
                            setEdit({
                              kind: "topic",
                              row: newTopic(subjectId, unit.id, t.id, topics.length),
                            })
                          }
                        />
                        <Button
                          title="Mark revised"
                          kind="quiet"
                          onPress={() => void act((e) => e.reviseTopic(t.id))}
                        />
                      </View>
                    </View>
                  );
                })}
                <View style={s.wrap}>
                  <Button
                    title="Add topic"
                    kind="secondary"
                    icon="plus"
                    onPress={() =>
                      setEdit({
                        kind: "topic",
                        row: newTopic(subjectId, unit.id, null, topics.length),
                      })
                    }
                  />
                  <Button
                    title={
                      unitTopics.every((t) => t.classCovered)
                        ? "Unmark class coverage"
                        : "Class covered this unit"
                    }
                    kind="quiet"
                    onPress={() =>
                      void act(async (e) => {
                        const all = unitTopics.every((t) => t.classCovered);
                        for (const t of topics.filter(
                          (x) => x.unitId === unit.id,
                        ))
                          await e.save("syllabusTopics", {
                            ...t,
                            classCovered: all ? 0 : 1,
                          });
                      })
                    }
                  />
                  <Button
                    title="Edit unit"
                    kind="quiet"
                    onPress={() => setEdit({ kind: "unit", row: unit })}
                  />
                </View>
              </>
            )}
          </Card>
        );
      })}
      <Button
        title="Add unit"
        kind="secondary"
        icon="plus"
        onPress={() =>
          setEdit({
            kind: "unit",
            row: {
              id: uid(),
              subjectId,
              position: units.length + 1,
              title: `Unit ${units.length + 1}`,
              description: "",
              covered: 0,
            },
          })
        }
      />
      {edit && (
        <Editor
          key={edit.kind + edit.row.id}
          title={edit.kind === "unit" ? "Syllabus unit" : "Topic"}
          initial={edit.row}
          fields={
            edit.kind === "unit"
              ? [
                  { key: "title", label: "Unit title" },
                  { key: "position", label: "Order", type: "number" },
                  { key: "description", label: "Description", type: "multiline" },
                ]
              : [
                  { key: "title", label: "Topic" },
                  { key: "state", label: "Where you are", options: [...topicStates] },
                  {
                    key: "classCovered",
                    label: "Covered in class",
                    options: ["0", "1"],
                  },
                  {
                    key: "importance",
                    label: "Importance · 0 none, 1 important, 2 very",
                    options: ["0", "1", "2"],
                  },
                  {
                    key: "teacherImportant",
                    label: "Teacher said it matters",
                    options: ["0", "1"],
                  },
                  { key: "weak", label: "Weak topic", options: ["0", "1"] },
                  {
                    key: "confidence",
                    label: "Confidence 1–5",
                    type: "number",
                  },
                  {
                    key: "estimatedMinutes",
                    label: "Minutes to study it",
                    type: "number",
                  },
                  { key: "pyqCount", label: "Times asked before", type: "number" },
                  { key: "pyqYears", label: "Years asked", placeholder: "2024, 2025" },
                  { key: "pyqMarks", label: "Marks pattern", placeholder: "8 marks" },
                  {
                    key: "pyqDifficulty",
                    label: "Difficulty",
                    options: ["", "Easy", "Medium", "Hard"],
                  },
                  { key: "pyqSolved", label: "PYQ solved", options: ["0", "1"] },
                  { key: "resourceLinks", label: "Resources", type: "multiline" },
                  { key: "personalNotes", label: "Your notes", type: "multiline" },
                ]
          }
          onSave={(v) =>
            act((e) =>
              edit.kind === "unit"
                ? e.save("syllabusUnits", {
                    ...edit.row,
                    ...v,
                    position: Number(v.position) || 1,
                  })
                : e.save("syllabusTopics", {
                    ...edit.row,
                    ...v,
                    classCovered: Number(v.classCovered) || 0,
                    importance: Number(v.importance) || 0,
                    teacherImportant: Number(v.teacherImportant) || 0,
                    weak: Number(v.weak) || 0,
                    confidence: Math.min(5, Math.max(0, Number(v.confidence) || 0)),
                    estimatedMinutes: Number(v.estimatedMinutes) || 30,
                    pyqCount: Number(v.pyqCount) || 0,
                    pyqSolved: Number(v.pyqSolved) || 0,
                  }),
            )
          }
          onDelete={() =>
            act((e) =>
              e.repo.remove(
                edit.kind === "unit" ? "syllabusUnits" : "syllabusTopics",
                edit.row.id,
              ),
            )
          }
          onClose={() => setEdit(null)}
        />
      )}
    </>
  );
}
const newTopic = (
  subjectId: string,
  unitId: string,
  parentId: string | null,
  count: number,
) => ({
  id: uid(),
  unitId,
  subjectId,
  parentId,
  position: count + 1,
  title: "",
  state: "Not started",
  classCovered: 0,
  notesCompleted: 0,
  conceptUnderstood: 0,
  practiceCompleted: 0,
  revisionCount: 0,
  confidence: 0,
  lastRevised: "",
  nextRevision: "",
  importance: 0,
  teacherImportant: 0,
  weak: 0,
  pyqCount: 0,
  pyqYears: "",
  pyqMarks: "",
  pyqDifficulty: "",
  pyqSolved: 0,
  estimatedMinutes: 30,
  resourceLinks: "",
  personalNotes: "",
});

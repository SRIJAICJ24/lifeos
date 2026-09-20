import React, { useEffect, useState } from "react";
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
import { displayName } from "../../domain/academic";
import { examPlan } from "../../domain/study";
import { assessmentTypes } from "../../domain/types";
import { clock, dateKey, daysBetween, duration, minutes, uid } from "../../domain/time";
export function Assessments({ startNew = false }: { startNew?: boolean }) {
  const { data, act } = useLife(),
    today = dateKey();
  const [edit, setEdit] = useState<any>(null);
  const [linking, setLinking] = useState<string | null>(null);
  const [view, setView] = useState("Upcoming");
  const subject = (id: string) => data.subjects.find((x) => x.id === id);
  const list = data.assessments
    .filter((a) => (view === "Upcoming" ? a.date >= today : a.date < today))
    .sort((a, b) =>
      view === "Upcoming"
        ? a.date.localeCompare(b.date)
        : b.date.localeCompare(a.date),
    );
  const blank = () => ({
    id: uid(),
    subjectId: data.subjects[0]?.id ?? "",
    subjectTitle: data.subjects[0]?.title ?? "",
    assessmentType: "Cycle test",
    title: "",
    date: today,
    startTime: "10:00",
    duration: 60,
    room: "",
    maximumMarks: 50,
    weightage: 0,
    syllabus: "",
    targetMark: 0,
    actualMark: -1,
    notes: "",
    status: "Upcoming",
    taskId: null,
  });
  // Arriving from a quick action opens the form straight away.
  useEffect(() => {
    if (startNew && data.subjects.length) setEdit(blank());
  }, []);
  return (
    <>
      <Button
        title="New test or exam"
        icon="plus"
        onPress={() => setEdit(blank())}
      />
      <Segmented
        values={["Upcoming", "Past"]}
        value={view}
        onChange={setView}
      />
      {!list.length && (
        <Card>
          <Empty
            text={
              view === "Upcoming"
                ? "No tests scheduled. Add one and its countdown starts here."
                : "No past assessments recorded."
            }
          />
        </Card>
      )}
      {list.map((a) => {
        const plan = examPlan(data, a, today);
        const colour = subjectColour(subject(a.subjectId));
        const days = daysBetween(today, a.date);
        return (
          <Card key={a.id} style={{ borderTopColor: colour, borderTopWidth: 3 }}>
            <View style={[s.row, { justifyContent: "space-between" }]}>
              <Tag
                text={displayName(subject(a.subjectId)).toUpperCase()}
                color={colour}
              />
              <Tag text={a.assessmentType.toUpperCase()} color={colors.muted} />
            </View>
            <Text style={[s.h2, { fontSize: 23 }]}>{a.title}</Text>
            <Text style={s.muted}>
              {a.date} · {clock(a.startTime)} – {clock(a.startTime + a.duration)}
              {a.room ? ` · ${a.room}` : ""}
              {a.maximumMarks ? ` · ${a.maximumMarks} marks` : ""}
            </Text>
            {view === "Upcoming" && (
              <>
                <Text
                  style={{
                    color: colour,
                    fontSize: 34,
                    fontWeight: "700",
                    letterSpacing: -1,
                  }}
                >
                  {days === 0 ? "Today" : days === 1 ? "Tomorrow" : `${days} days`}
                </Text>
                {plan.topics.length ? (
                  <>
                    <View style={s.wrap}>
                      <Stat
                        label="Topics"
                        value={`${plan.done.length} / ${plan.topics.length}`}
                        hint="practised"
                        color={colour}
                      />
                      <Stat
                        label="Preparation"
                        value={`${plan.progress}%`}
                        color={colors.diet}
                      />
                      <Stat
                        label="Study left"
                        value={duration(plan.needed)}
                        hint={`${duration(plan.free)} free before it`}
                        color={colors.skills}
                      />
                    </View>
                    <Progress value={plan.progress} color={colour} />
                    <Tag
                      text={plan.status.toUpperCase()}
                      color={plan.onTrack ? colors.accent : colors.fitness}
                    />
                  </>
                ) : (
                  <Text style={s.muted}>
                    No syllabus topics linked yet — link them to get a preparation
                    figure and a study plan.
                  </Text>
                )}
              </>
            )}
            {a.syllabus ? (
              <Text style={s.muted}>Portions: {a.syllabus}</Text>
            ) : null}
            {view === "Past" && (
              <Text style={s.muted}>
                {a.actualMark >= 0
                  ? `Scored ${a.actualMark}${a.maximumMarks ? ` / ${a.maximumMarks}` : ""}`
                  : "Mark not recorded yet"}
              </Text>
            )}
            <View style={s.wrap}>
              <Button
                title="Link syllabus topics"
                kind="secondary"
                icon="link"
                onPress={() => setLinking(a.id)}
              />
              {view === "Upcoming" && (
                <Button
                  title="Plan revision"
                  kind="secondary"
                  icon="calendar"
                  onPress={() =>
                    void act(async (e) => {
                      const n = await e.planExamRevision(a.id);
                      if (!n)
                        throw new Error(
                          "Those topics are already planned. Check Today.",
                        );
                    }, "Revision sessions added to your plan")
                  }
                />
              )}
              <Button
                title="Edit"
                kind="quiet"
                icon="edit-2"
                onPress={() =>
                  setEdit({
                    ...a,
                    subjectTitle: subject(a.subjectId)?.title ?? "",
                    startTime: clock(a.startTime),
                  })
                }
              />
            </View>
          </Card>
        );
      })}
      {linking && (
        <TopicLinker id={linking} onClose={() => setLinking(null)} />
      )}
      {edit && (
        <Editor
          title="Test or exam"
          initial={edit}
          fields={[
            { key: "title", label: "Title", placeholder: "FT-2" },
            {
              key: "subjectTitle",
              label: "Subject",
              options: data.subjects.map((x) => x.title),
            },
            {
              key: "assessmentType",
              label: "Type",
              options: [...assessmentTypes],
            },
            { key: "date", label: "Date · YYYY-MM-DD" },
            { key: "startTime", label: "Starts · HH:mm" },
            { key: "duration", label: "Minutes", type: "number" },
            { key: "room", label: "Room" },
            { key: "maximumMarks", label: "Maximum marks", type: "number" },
            { key: "weightage", label: "Weightage toward internals", type: "number" },
            { key: "targetMark", label: "Target mark", type: "number" },
            { key: "actualMark", label: "Mark scored (−1 if not yet)", type: "number" },
            { key: "syllabus", label: "Portions", type: "multiline" },
            { key: "notes", label: "Notes", type: "multiline" },
          ]}
          onSave={(v) =>
            act((e) => {
              const found = data.subjects.find((x) => x.title === v.subjectTitle);
              if (!found) throw new Error("Choose a subject.");
              return e.saveAssessment({
                ...edit,
                ...v,
                subjectId: found.id,
                startTime: minutes(v.startTime!),
                duration: Number(v.duration) || 60,
                maximumMarks: Number(v.maximumMarks) || 0,
                weightage: Number(v.weightage) || 0,
                targetMark: Number(v.targetMark) || 0,
                actualMark: Number(v.actualMark),
              });
            }, "Saved — it is on your calendar and countdown")
          }
          onDelete={() =>
            act(async (e) => {
              await e.repo.remove("assessments", edit.id);
              if (edit.taskId) await e.repo.remove("tasks", edit.taskId);
            })
          }
          onClose={() => setEdit(null)}
        />
      )}
    </>
  );
}
function TopicLinker({ id, onClose }: { id: string; onClose: () => void }) {
  const { data, act } = useLife();
  const assessment = data.assessments.find((a) => a.id === id);
  if (!assessment) return null;
  const topics = data.syllabusTopics.filter(
    (t) => t.subjectId === assessment.subjectId,
  );
  const linked = new Set(
    data.assessmentTopics
      .filter((a) => a.assessmentId === id)
      .map((a) => a.topicId),
  );
  const units = data.syllabusUnits
    .filter((u) => u.subjectId === assessment.subjectId)
    .sort((a, b) => a.position - b.position);
  return (
    <Editor
      title={`Portions for ${assessment.title}`}
      initial={{}}
      fields={[]}
      saveLabel="Done"
      onSave={async () => true}
      onClose={onClose}
    >
      {!topics.length ? (
        <Empty text="This subject has no syllabus topics yet. Add them under Syllabus first." />
      ) : (
        units.map((unit) => (
          <View key={unit.id} style={{ gap: 10 }}>
            <Text style={s.label}>{unit.title.toUpperCase()}</Text>
            {topics
              .filter((t) => t.unitId === unit.id)
              .sort((a, b) => a.position - b.position)
              .map((t) => (
                <Pressable
                  key={t.id}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: linked.has(t.id) }}
                  accessibilityLabel={t.title}
                  onPress={() =>
                    void act((e) =>
                      linked.has(t.id)
                        ? e.repo.remove(
                            "assessmentTopics",
                            data.assessmentTopics.find(
                              (a) => a.assessmentId === id && a.topicId === t.id,
                            )!.id,
                          )
                        : e.save("assessmentTopics", {
                            id: `link-${id}-${t.id}`,
                            assessmentId: id,
                            topicId: t.id,
                          }),
                    )
                  }
                  style={({ pressed }) => [
                    s.row,
                    { opacity: pressed ? 0.6 : 1, gap: 10 },
                  ]}
                >
                  <View
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 6,
                      borderWidth: 1,
                      borderColor: colors.border,
                      backgroundColor: linked.has(t.id)
                        ? colors.accent
                        : "transparent",
                    }}
                  />
                  <Text style={[s.text, s.grow]}>{t.title}</Text>
                  <Text style={s.muted}>{t.state}</Text>
                </Pressable>
              ))}
          </View>
        ))
      )}
    </Editor>
  );
}

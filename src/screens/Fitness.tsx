import React, { useState } from "react";
import { View, Text } from "react-native";
import { useLife } from "../state/store";
import { Card, Button, Editor, Tag, Empty } from "../ui/components";
import { styles as s, colors } from "../ui/theme";
import { uid, dateKey, duration } from "../domain/time";
import { newTask } from "../data/seed";
export function Fitness() {
  const { data, act } = useLife(),
    [edit, setEdit] = useState<{ kind: string; row: any } | null>(null);
  return (
    <>
      <View style={s.wrap}>
        <Button
          title="New workout plan"
          icon="plus"
          onPress={() =>
            setEdit({
              kind: "workout",
              row: {
                id: uid(),
                title: "",
                duration: 45,
                weekday: new Date().getDay(),
              },
            })
          }
        />
        <Button
          title="Log body measurement"
          kind="secondary"
          onPress={() =>
            setEdit({
              kind: "body",
              row: { id: uid(), date: dateKey(), weight: 65, waist: 0 },
            })
          }
        />
      </View>
      {data.workouts.map((w) => (
        <Card key={w.id}>
          <View style={[s.row, { justifyContent: "space-between" }]}>
            <Tag
              text={`${["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"][w.weekday]} · ${duration(w.duration)}`}
              color={colors.fitness}
            />
            <Button
              title="Edit workout"
              kind="quiet"
              onPress={() => setEdit({ kind: "workout", row: w })}
            />
          </View>
          <Text style={[s.h2, { fontSize: 26 }]}>{w.title}</Text>
          {data.exercises
            .filter((e) => e.workoutId === w.id)
            .map((e) => (
              <View
                key={e.id}
                style={[s.row, { justifyContent: "space-between" }]}
              >
                <View style={s.grow}>
                  <Text style={s.text}>{e.title}</Text>
                  <Text style={s.muted}>
                    {e.sets} sets × {e.reps} reps · {e.weight} kg · {e.rest}s
                    rest
                  </Text>
                </View>
                <Button
                  title="Edit exercise"
                  kind="quiet"
                  onPress={() => setEdit({ kind: "exercise", row: e })}
                />
              </View>
            ))}
          <View style={s.wrap}>
            <Button
              title="Log workout"
              onPress={() =>
                setEdit({
                  kind: "log",
                  row: {
                    id: uid(),
                    workoutId: w.id,
                    date: dateKey(),
                    duration: w.duration,
                    notes: "",
                  },
                })
              }
            />
            <Button
              title="Add exercise"
              kind="secondary"
              onPress={() =>
                setEdit({
                  kind: "exercise",
                  row: {
                    id: uid(),
                    workoutId: w.id,
                    title: "",
                    sets: 3,
                    reps: 12,
                    weight: 0,
                    rest: 60,
                  },
                })
              }
            />
            <Button
              title="Add to Life Engine"
              kind="quiet"
              onPress={() =>
                void act(async (e) => {
                  if (
                    data.tasks.some(
                      (t) =>
                        t.subcategory === w.id &&
                        !["Completed", "Cancelled"].includes(t.status),
                    )
                  )
                    throw new Error("This workout already has a pending task.");
                  await e.save("tasks", {
                    ...newTask(w.title, "fitness", uid()),
                    subcategory: w.id,
                    estimatedDuration: w.duration,
                    minimumSessionLength: w.duration,
                    splittable: 0,
                  });
                }, "Workout added to your task list.")
              }
            />
          </View>
        </Card>
      ))}
      {!data.workouts.length && (
        <Empty text="Create a workout that fits your routine." />
      )}
      <Card>
        <Text style={s.h2}>Progress history</Text>
        {data.workoutLogs
          .slice()
          .reverse()
          .slice(0, 10)
          .map((l) => (
            <Text key={l.id} style={s.muted}>
              {l.date} ·{" "}
              {data.workouts.find((w) => w.id === l.workoutId)?.title} ·{" "}
              {duration(l.duration)} {l.notes}
            </Text>
          ))}
        {data.bodyMetrics
          .slice()
          .reverse()
          .slice(0, 10)
          .map((l) => (
            <Text key={l.id} style={s.muted}>
              {l.date} · {l.weight} kg {l.waist ? `· waist ${l.waist} cm` : ""}
            </Text>
          ))}
        {!data.workoutLogs.length && !data.bodyMetrics.length && (
          <Empty text="Your first log starts your progress history." />
        )}
      </Card>
      {edit && (
        <Editor
          title={
            edit.kind === "exercise"
              ? "Exercise details"
              : edit.kind === "body"
                ? "Body measurement"
                : edit.kind === "log"
                  ? "Log workout"
                  : "Workout plan"
          }
          initial={edit.row}
          fields={
            edit.kind === "exercise"
              ? [
                  { key: "title", label: "Exercise" },
                  { key: "sets", label: "Sets", type: "number" },
                  { key: "reps", label: "Reps", type: "number" },
                  { key: "weight", label: "Weight · kg", type: "number" },
                  { key: "rest", label: "Rest · seconds", type: "number" },
                ]
              : edit.kind === "body"
                ? [
                    { key: "date", label: "Date" },
                    {
                      key: "weight",
                      label: "Body weight · kg",
                      type: "number",
                    },
                    {
                      key: "waist",
                      label: "Waist · cm (0 if not measured)",
                      type: "number",
                    },
                  ]
                : edit.kind === "log"
                  ? [
                      { key: "date", label: "Date" },
                      {
                        key: "duration",
                        label: "Actual workout minutes",
                        type: "number",
                      },
                      {
                        key: "notes",
                        label: "Sets, weights & notes",
                        type: "multiline",
                      },
                    ]
                  : [
                      { key: "title", label: "Workout name" },
                      {
                        key: "duration",
                        label: "Planned minutes",
                        type: "number",
                      },
                      {
                        key: "weekday",
                        label: "Weekday · 0 Sun / 1 Mon … 6 Sat",
                        options: ["0", "1", "2", "3", "4", "5", "6"],
                      },
                    ]
          }
          onSave={(v) =>
            act(async (e) => {
              const row: any = { ...edit.row, ...v };
              for (const key of [
                "duration",
                "weekday",
                "sets",
                "reps",
                "weight",
                "rest",
                "waist",
              ])
                if (key in row) {
                  row[key] = Number(row[key]);
                  if (!Number.isFinite(row[key]) || row[key] < 0)
                    throw new Error("Use non-negative numeric values.");
                }
              if ("duration" in row && row.duration <= 0)
                throw new Error("Duration must be positive.");
              await e.save(
                edit.kind === "exercise"
                  ? "exercises"
                  : edit.kind === "body"
                    ? "bodyMetrics"
                    : edit.kind === "log"
                      ? "workoutLogs"
                      : "workouts",
                row,
              );
              if (edit.kind === "log") {
                const linked = data.tasks.find(
                  (t) =>
                    t.subcategory === row.workoutId &&
                    !["Completed", "Cancelled"].includes(t.status),
                );
                if (linked)
                  await e.finish(
                    linked.id,
                    "Completed",
                    row.duration,
                    100,
                    row.notes,
                  );
              }
            })
          }
          onDelete={() =>
            act((e) =>
              e.repo.remove(
                edit.kind === "exercise"
                  ? "exercises"
                  : edit.kind === "body"
                    ? "bodyMetrics"
                    : edit.kind === "log"
                      ? "workoutLogs"
                      : "workouts",
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

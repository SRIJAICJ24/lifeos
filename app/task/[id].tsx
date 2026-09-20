import React, { useEffect, useState } from "react";
import { View, Text } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Shell } from "../../src/ui/Shell";
import {
  Card,
  Heading,
  Button,
  Editor,
  Progress,
  Tag,
  Empty,
  Field,
} from "../../src/ui/components";
import { styles as s, colors } from "../../src/ui/theme";
import { useLife } from "../../src/state/store";
import { duration, uid } from "../../src/domain/time";
import { remaining } from "../../src/domain/priority";
export default function TaskDetail() {
  const { id } = useLocalSearchParams<{ id: string }>(),
    { data, act, engine } = useLife(),
    router = useRouter();
  const task = data.tasks.find((t) => t.id === id);
  const [edit, setEdit] = useState(false),
    [finish, setFinish] = useState(false),
    [active, setActive] = useState<{ start: number; planned: number } | null>(
      null,
    ),
    [tick, setTick] = useState(Date.now());
  useEffect(() => {
    void engine?.repo.db
      .getAllAsync<{ value: string }>(
        "SELECT value FROM settings WHERE key=?",
        `focus-${id}`,
      )
      .then((rows) => {
        if (rows[0]) setActive(JSON.parse(rows[0].value));
      });
    const timer = setInterval(() => setTick(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [id]);
  if (!task)
    return (
      <Shell>
        <Empty
          text="This task is no longer here."
          action={
            <Button title="Back to Today" onPress={() => router.push("/")} />
          }
        />
      </Shell>
    );
  const elapsed = active
    ? Math.max(0, Math.floor((tick - active.start) / 1000))
    : 0;
  const seconds = active
    ? Math.max(0, active.planned * 60 - elapsed)
    : data.settings.focusDuration * 60;
  const fields: Field[] = [
    { key: "title", label: "Title" },
    { key: "description", label: "Objective", type: "multiline" },
    { key: "deadline", label: "Deadline · YYYY-MM-DD (optional)" },
    { key: "estimatedDuration", label: "Estimated minutes", type: "number" },
    {
      key: "minimumSessionLength",
      label: "Minimum session minutes",
      type: "number",
    },
    { key: "priority", label: "Priority", options: ["1", "2", "3"] },
    {
      key: "importance",
      label: "Importance",
      options: ["1", "2", "3", "4", "5"],
    },
    { key: "splittable", label: "Splittable (1 = yes)", options: ["1", "0"] },
    { key: "recurrence", label: "Repeats", options: ["", "daily", "weekly"] },
    {
      key: "status",
      label: "Status",
      options: [
        "Inbox",
        "Not Started",
        "Scheduled",
        "In Progress",
        "Partially Completed",
        "Skipped",
        "Overdue",
        "Cancelled",
      ],
    },
    { key: "notes", label: "Notes", type: "multiline" },
  ];
  return (
    <Shell>
      <Button
        title="Back"
        kind="quiet"
        icon="arrow-left"
        onPress={() => router.back()}
      />
      <Heading
        title={task.title}
        subtitle={`${task.lifeArea} · ${task.subcategory}`}
        right={
          <Button
            title="Edit task"
            kind="secondary"
            icon="edit-2"
            onPress={() => setEdit(true)}
          />
        }
      />
      <View style={s.grid}>
        <Card style={s.column}>
          <Tag text={task.status.toUpperCase()} color={colors[task.lifeArea]} />
          <Text style={s.text}>
            {task.description ||
              "Give this session your attention. One thing at a time."}
          </Text>
          <Progress value={task.progress} />
          <View style={[s.row, { justifyContent: "space-between" }]}>
            <Text style={s.muted}>{task.progress}% complete</Text>
            <Text style={s.muted}>{duration(remaining(task))} remaining</Text>
          </View>
          <View style={s.divider} />
          <Text style={s.text}>
            Planned {duration(task.estimatedDuration)} · Actual{" "}
            {duration(task.actualDuration)}
          </Text>
          <Text style={s.muted}>
            {task.deadline
              ? `Due ${task.deadline}`
              : "No deadline. A little flexibility."}
          </Text>
          {task.notes && <Text style={s.muted}>{task.notes}</Text>}
          <Button
            title="Log progress / complete"
            icon="check"
            disabled={task.status === "Completed"}
            onPress={() => setFinish(true)}
          />
        </Card>
        <Card
          style={[
            s.column,
            {
              alignItems: "center",
              justifyContent: "center",
              paddingVertical: 32,
            },
          ]}
        >
          <Text style={s.label}>FOCUS SESSION</Text>
          <Text
            style={{
              fontSize: 66,
              color: colors.text,
              fontWeight: "300",
              fontVariant: ["tabular-nums"],
              letterSpacing: -2,
            }}
          >
            {String(Math.floor(seconds / 60)).padStart(2, "0")}:
            {String(seconds % 60).padStart(2, "0")}
          </Text>
          <Text style={[s.muted, { textAlign: "center" }]}>
            {active
              ? seconds === 0
                ? "Your session is up. Take a breath and log what happened."
                : "One small step forward."
              : task.description || "A little focus goes a long way."}
          </Text>
          <Button
            title={active ? "Finish session" : "Start focus session"}
            icon={active ? "square" : "play"}
            disabled={task.status === "Completed"}
            onPress={() => {
              if (active) {
                setFinish(true);
                return;
              }
              void act(async (e) => {
                setActive(await e.startFocus(id));
              }, "Focus started. Your timer survives reopening.");
            }}
          />
        </Card>
      </View>
      <Card>
        <Text style={s.h2}>Plans change. Adjust yours.</Text>
        <Text style={s.muted}>
          Find another time, skip this one, or leave it open.
        </Text>
        <View style={s.wrap}>
          {[
            "Later today",
            "Tomorrow",
            "Find next slot",
            "Skip today",
            "Keep unscheduled",
          ].map((mode) => (
            <Button
              key={mode}
              title={mode}
              kind="secondary"
              disabled={task.status === "Completed"}
              onPress={() =>
                void act(
                  (e) => e.reschedule(task.id, mode),
                  "Plan adjusted. Keep going at your own pace.",
                )
              }
            />
          ))}
        </View>
      </Card>
      <Card>
        <Text style={s.h2}>Session history</Text>
        {data.sessions
          .filter((x) => x.taskId === id)
          .map((session) => (
            <View key={session.id} style={{ gap: 6 }}>
              <Text style={s.text}>
                {session.date} · {session.outcome}
              </Text>
              <Text style={s.muted}>
                {duration(session.planned)} planned → {duration(session.actual)}{" "}
                actual {session.notes && `· ${session.notes}`}
              </Text>
            </View>
          ))}
        {!data.sessions.some((x) => x.taskId === id) && (
          <Empty text="Your first session starts the story." />
        )}
      </Card>
      {edit && (
        <Editor
          title="Edit task"
          fields={fields}
          initial={task}
          onSave={(v) =>
            act((e) =>
              e.save("tasks", {
                ...task,
                ...v,
                deadline: v.deadline || null,
                estimatedDuration: Number(v.estimatedDuration),
                minimumSessionLength: Number(v.minimumSessionLength),
                priority: Number(v.priority),
                importance: Number(v.importance),
                splittable: Number(v.splittable),
              }),
            )
          }
          onDelete={async () => {
            const ok = await act((e) => e.repo.remove("tasks", id));
            if (ok) router.replace("/");
            return ok;
          }}
          onClose={() => setEdit(false)}
        />
      )}
      {finish && (
        <Editor
          title="How did it go?"
          initial={{
            outcome: "Completed",
            actual: active ? Math.round(elapsed / 60) : remaining(task),
            progress: task.progress,
            notes: "",
          }}
          fields={[
            {
              key: "outcome",
              label: "Result",
              options: ["Completed", "Partially completed", "Could not work"],
            },
            { key: "actual", label: "Actual minutes", type: "number" },
            {
              key: "progress",
              label: "Total progress % (for partial completion)",
              type: "number",
            },
            { key: "notes", label: "Session notes", type: "multiline" },
          ]}
          onSave={(v) =>
            act(async (e) => {
              await e.finish(
                id,
                v.outcome!,
                Number(v.actual),
                Number(v.progress),
                v.notes,
                active?.planned,
                active ? new Date(active.start).toISOString() : undefined,
              );
              await e.repo.db.runAsync(
                "DELETE FROM settings WHERE key=?",
                `focus-${id}`,
              );
              setActive(null);
            }, "Progress saved. Every session counts.")
          }
          onClose={() => setFinish(false)}
        />
      )}
    </Shell>
  );
}

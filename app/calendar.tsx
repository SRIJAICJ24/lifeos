import React, { useState } from "react";
import { View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { Shell } from "../src/ui/Shell";
import {
  Button,
  Card,
  Heading,
  Choices,
  Tag,
  Empty,
  Editor,
} from "../src/ui/components";
import { styles as s, colors } from "../src/ui/theme";
import { useLife } from "../src/state/store";
import {
  dateKey,
  addDays,
  addMonths,
  parseDate,
  clock,
  minutes,
} from "../src/domain/time";
import { dayOrder } from "../src/domain/dayOrder";
import { fixedBlocks } from "../src/domain/freeTime";
export default function Calendar() {
  const { data, act } = useLife(),
    router = useRouter();
  const [date, setDate] = useState(dateKey()),
    [mode, setMode] = useState("Week"),
    [editing, setEditing] = useState<any>(null);
  const first =
    mode === "Month"
      ? date.slice(0, 8) + "01"
      : mode === "Week"
        ? addDays(date, -((parseDate(date).getDay() + 6) % 7))
        : date;
  const count =
    mode === "Month"
      ? new Date(
          parseDate(date).getFullYear(),
          parseDate(date).getMonth() + 1,
          0,
        ).getDate()
      : mode === "Week"
        ? 7
        : 1;
  const order = dayOrder(date, data.calendar, data.settings);
  const blocks = [
    ...fixedBlocks(data, date).filter((b) => b.id !== "college"),
    ...data.blocks.filter((b) => b.date === date && b.kind === "session"),
  ].sort((a, b) => a.start - b.start);
  return (
    <Shell>
      <Heading
        title="Your time, in view."
        subtitle="A single calendar for all the parts of your day."
        right={
          <Button
            title="Add event"
            icon="plus"
            kind="secondary"
            onPress={() => router.push("/capture")}
          />
        }
      />
      <View
        style={[s.row, { justifyContent: "space-between", flexWrap: "wrap" }]}
      >
        <Choices
          values={["Day", "Week", "Month"]}
          value={mode}
          onChange={setMode}
        />
        <View style={s.row}>
          <Button
            title="Previous"
            kind="quiet"
            onPress={() =>
              setDate(
                mode === "Month"
                  ? addMonths(date, -1)
                  : addDays(date, mode === "Week" ? -7 : -1),
              )
            }
          />
          <Button
            title="Today"
            kind="secondary"
            onPress={() => setDate(dateKey())}
          />
          <Button
            title="Next"
            kind="quiet"
            onPress={() =>
              setDate(
                mode === "Month"
                  ? addMonths(date, 1)
                  : addDays(date, mode === "Week" ? 7 : 1),
              )
            }
          />
        </View>
      </View>
      <Button
        title="Plan this day"
        kind="secondary"
        disabled={date < dateKey()}
        onPress={() =>
          void act((e) => e.generate(date), "This day’s plan is ready.")
        }
      />
      <Card>
        <Text style={s.h2}>
          {parseDate(date).toLocaleDateString("en-IN", {
            month: "long",
            year: "numeric",
          })}
        </Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 5 }}>
          {Array.from({ length: count }, (_, i) => {
            const d = addDays(first, i),
              o = dayOrder(d, data.calendar, data.settings);
            return (
              <Pressable
                key={d}
                accessibilityRole="button"
                accessibilityLabel={`Select ${d}`}
                onPress={() => setDate(d)}
                style={{
                  width: mode === "Month" ? "13%" : undefined,
                  flex: mode === "Month" ? undefined : 1,
                  minWidth: 36,
                  paddingVertical: 14,
                  alignItems: "center",
                  gap: 8,
                  borderRadius: 12,
                  backgroundColor: d === date ? colors.accent : colors.raised,
                }}
              >
                <Text
                  style={{
                    fontSize: 9,
                    color: d === date ? colors.bg : colors.muted,
                  }}
                >
                  {parseDate(d).toLocaleDateString("en", { weekday: "short" })}
                </Text>
                <Text
                  style={{
                    fontSize: 20,
                    color: d === date ? colors.bg : colors.text,
                    fontWeight: "600",
                  }}
                >
                  {parseDate(d).getDate()}
                </Text>
                <Text
                  style={{
                    fontSize: 9,
                    color: d === date ? colors.bg : colors.academic,
                  }}
                >
                  {o.order ? `DO ${o.order}` : "—"}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Card>
      <View style={[s.row, { justifyContent: "space-between" }]}>
        <Text style={s.h2}>
          {parseDate(date).toLocaleDateString("en-IN", {
            weekday: "long",
            day: "numeric",
            month: "short",
          })}
        </Text>
        <Tag
          text={
            order.order ? `DAY ORDER ${order.order}` : order.type.toUpperCase()
          }
          color={colors.academic}
        />
      </View>
      <Card>
        {blocks.length ? (
          blocks.map((b) => (
            <Pressable
              key={b.id}
              accessibilityRole="button"
              accessibilityLabel={`Open event ${b.title}`}
              onPress={() =>
                b.kind !== "session" && data.blocks.some((x) => x.id === b.id)
                  ? setEditing(b)
                  : b.taskId
                    ? router.push({
                        pathname: "/task/[id]",
                        params: { id: b.taskId },
                      })
                    : data.blocks.some((x) => x.id === b.id)
                      ? setEditing(b)
                      : router.push("/area/academic")
              }
              style={[
                s.row,
                {
                  paddingVertical: 12,
                  borderBottomWidth: 1,
                  borderColor: colors.border,
                },
              ]}
            >
              <View style={{ width: 52, gap: 5 }}>
                <Text style={s.text}>{clock(b.start)}</Text>
                <Text style={[s.muted, { fontSize: 11 }]}>{clock(b.end)}</Text>
              </View>
              <View
                style={{
                  width: 3,
                  height: 40,
                  backgroundColor:
                    b.kind === "class"
                      ? colors.academic
                      : b.kind === "session"
                        ? colors.accent
                        : colors.personal,
                  borderRadius: 2,
                }}
              />
              <View style={s.grow}>
                <Text style={s.text}>{b.title}</Text>
                <Text style={s.muted}>
                  {b.kind} · {b.status}
                </Text>
              </View>
            </Pressable>
          ))
        ) : (
          <Empty text="Nothing fixed for this day. Your time is open." />
        )}
      </Card>
      {editing && (
        <Editor
          title="Edit event"
          initial={{
            ...editing,
            start: clock(editing.start),
            end: clock(editing.end),
          }}
          fields={[
            { key: "title", label: "Title" },
            { key: "date", label: "Date" },
            { key: "start", label: "Start · HH:mm" },
            { key: "end", label: "End · HH:mm" },
          ]}
          onSave={(v) =>
            act((e) =>
              e.repo.db.withTransactionAsync(async () => {
                await e.save("blocks", {
                  ...editing,
                  ...v,
                  start: minutes(v.start!),
                  end: minutes(v.end!),
                });
                if (editing.kind === "exam" && editing.taskId) {
                  const task = data.tasks.find((t) => t.id === editing.taskId);
                  if (task)
                    await e.save("tasks", {
                      ...task,
                      title: v.title,
                      deadline: v.date,
                      estimatedDuration: minutes(v.end!) - minutes(v.start!),
                      minimumSessionLength: Math.min(
                        task.minimumSessionLength,
                        minutes(v.end!) - minutes(v.start!),
                      ),
                    });
                }
              }),
            )
          }
          onDelete={() =>
            act((e) =>
              editing.kind === "exam" && editing.taskId
                ? e.repo.remove("tasks", editing.taskId)
                : e.repo.remove("blocks", editing.id),
            )
          }
          onClose={() => setEditing(null)}
        />
      )}
    </Shell>
  );
}

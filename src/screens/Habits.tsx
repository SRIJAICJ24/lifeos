import React, { useState } from "react";
import { View, Text } from "react-native";
import { useLife } from "../state/store";
import { Card, Button, Editor, Tag, Progress, Empty } from "../ui/components";
import { styles as s, colors } from "../ui/theme";
import { habitStats } from "../domain/analytics";
import { dateKey, uid, addDays } from "../domain/time";
export function Habits() {
  const { data, act } = useLife(),
    today = dateKey();
  const [edit, setEdit] = useState<any>(null),
    [log, setLog] = useState<any>(null);
  return (
    <>
      <Button
        title="New habit"
        icon="plus"
        onPress={() =>
          setEdit({
            id: uid(),
            title: "",
            type: "boolean",
            target: 1,
            unit: "done",
            duration: 15,
            startDate: today,
          })
        }
      />
      <View style={s.grid}>
        {data.habits.map((h, i) => {
          const stats = habitStats(h, data, today),
            color = [
              colors.habits,
              colors.fitness,
              colors.skills,
              colors.personal,
            ][i % 4]!;
          return (
            <Card
              key={h.id}
              style={{
                flexBasis: 310,
                flexGrow: 1,
                borderTopColor: color,
                borderTopWidth: 3,
              }}
            >
              <View style={[s.row, { justifyContent: "space-between" }]}>
                <Tag text={h.type.toUpperCase()} color={color} />
                <Button
                  title={`Edit ${h.title}`}
                  kind="quiet"
                  icon="edit-2"
                  onPress={() => setEdit(h)}
                />
              </View>
              <Text style={[s.h2, { fontSize: 23 }]}>{h.title}</Text>
              <Text style={{ color, fontSize: 32, fontWeight: "600" }}>
                {stats.value}
                <Text style={s.muted}>
                  {" "}
                  / {h.target} {h.unit}
                </Text>
              </Text>
              <Progress value={(stats.value / h.target) * 100} color={color} />
              <View style={[s.row, { justifyContent: "space-between" }]}>
                <Text style={s.muted}>{stats.streak} day streak</Text>
                <Text style={s.muted}>{stats.rate}% this week</Text>
              </View>
              <View style={{ flexDirection: "row", gap: 5, flexWrap: "wrap" }}>
                {Array.from({ length: 28 }, (_, i) => {
                  const d = addDays(today, i - 27),
                    value =
                      data.habitLogs.find(
                        (l) => l.habitId === h.id && l.date === d,
                      )?.value ?? 0;
                  return (
                    <View
                      key={d}
                      accessibilityLabel={`${d}: ${value}/${h.target}`}
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: 4,
                        backgroundColor:
                          value >= h.target
                            ? color
                            : value > 0
                              ? color + "60"
                              : colors.raised,
                      }}
                    />
                  );
                })}
              </View>
              <Text style={[s.muted, { fontSize: 11 }]}>
                Last 28 days · {stats.total} completions · best streak{" "}
                {stats.longest}
              </Text>
              <View style={s.wrap}>
                <Button
                  title={
                    h.type === "boolean"
                      ? stats.value >= 1
                        ? "Undo check-in"
                        : "Check in"
                      : "+ Log progress"
                  }
                  onPress={() =>
                    h.type === "boolean"
                      ? void act((e) =>
                          e.logHabit(h.id, stats.value >= 1 ? 0 : 1),
                        )
                      : setLog({ ...h, value: stats.value, date: today })
                  }
                />
                {h.type !== "boolean" && (
                  <Button
                    title={`+ ${h.type === "duration" ? 5 : 1}`}
                    kind="secondary"
                    onPress={() =>
                      void act((e) =>
                        e.logHabit(
                          h.id,
                          stats.value + (h.type === "duration" ? 5 : 1),
                        ),
                      )
                    }
                  />
                )}
                <Button
                  title="History / backfill"
                  kind="quiet"
                  onPress={() =>
                    setLog({ ...h, value: stats.value, date: today })
                  }
                />
              </View>
            </Card>
          );
        })}
      </View>
      {!data.habits.length && (
        <Empty text="Start with one small habit you want to make room for." />
      )}
      {edit && (
        <Editor
          title="Habit details"
          initial={edit}
          fields={[
            { key: "title", label: "Habit name" },
            {
              key: "type",
              label: "Tracking type",
              options: ["boolean", "counter", "duration", "quantity"],
            },
            { key: "target", label: "Daily target", type: "number" },
            { key: "unit", label: "Unit (pages, min, glasses…)" },
            {
              key: "duration",
              label: "Daily task minutes (0 = no scheduled task)",
              type: "number",
            },
          ]}
          onSave={(v) =>
            act((e) => {
              if (Number(v.target) <= 0 || Number(v.duration) < 0)
                throw new Error(
                  "Use a positive target and non-negative duration.",
                );
              return e.save("habits", {
                ...edit,
                ...v,
                target: v.type === "boolean" ? 1 : Number(v.target),
                duration: Number(v.duration),
              });
            })
          }
          onDelete={() => act((e) => e.repo.remove("habits", edit.id))}
          onClose={() => setEdit(null)}
        />
      )}
      {log && (
        <Editor
          title={`Log ${log.title}`}
          initial={{ date: log.date, value: log.value }}
          fields={[
            { key: "date", label: "Date · YYYY-MM-DD" },
            {
              key: "value",
              label: `Total ${log.unit} for this day`,
              type: "number",
            },
          ]}
          onSave={(v) =>
            act((e) => e.logHabit(log.id, Number(v.value), v.date))
          }
          onClose={() => setLog(null)}
        />
      )}
    </>
  );
}

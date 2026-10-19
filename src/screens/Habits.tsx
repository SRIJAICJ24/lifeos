import React, { useState } from "react";
import { View, Text, Pressable } from "react-native";
import { useLife } from "../state/store";
import { Card, Button, Editor, Tag, Progress, Empty } from "../ui/components";
import { styles as s, colors } from "../ui/theme";
import { habitStats } from "../domain/analytics";
import { dateKey, uid, addDays } from "../domain/time";

const WEEKS = 15;
const dayLabels = ["Mon", "", "Wed", "", "Fri", "", "Sun"];
const shortMonths = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

interface GridCell {
  date: string;
  value: number;
  col: number;
  row: number;
  day: number;
  month: number;
  monthName: string;
}

function ContributionGraph({
  habit,
  data,
  today,
  color,
  onDayPress,
}: {
  habit: any;
  data: any;
  today: string;
  color: string;
  onDayPress: (date: string, value: number) => void;
}) {
  const [selected, setSelected] = useState<GridCell | null>(null);

  const todayDate = new Date(`${today}T00:00:00`);
  const todayDow = todayDate.getDay();
  const endOffset = todayDow === 0 ? 6 : todayDow - 1;
  const totalDays = (WEEKS - 1) * 7 + endOffset + 1;
  const startDate = addDays(today, -(totalDays - 1));

  const grid: GridCell[] = [];
  for (let i = 0; i < totalDays; i++) {
    const d = addDays(startDate, i);
    const dt = new Date(`${d}T00:00:00`);
    const dow = dt.getDay();
    const row = dow === 0 ? 6 : dow - 1;
    const value =
      data.habitLogs.find(
        (l: any) => l.habitId === habit.id && l.date === d,
      )?.value ?? 0;
    grid.push({
      date: d,
      value,
      col: Math.floor(i / 7),
      row,
      day: dt.getDate(),
      month: dt.getMonth(),
      monthName: shortMonths[dt.getMonth()]!,
    });
  }

  const weeks: GridCell[][] = [];
  for (const cell of grid) {
    if (!weeks[cell.col]) weeks[cell.col] = [];
    weeks[cell.col]!.push(cell);
  }

  const monthLabels: { col: number; label: string }[] = [];
  let lastMonth = -1;
  for (let wi = 0; wi < weeks.length; wi++) {
    const firstCell = weeks[wi]?.find((c) => c.row === 0);
    if (firstCell && firstCell.month !== lastMonth) {
      monthLabels.push({ col: wi, label: firstCell.monthName });
      lastMonth = firstCell.month;
    }
  }

  const cellSize = 13;
  const gap = 2;
  const labelWidth = 28;

  const handlePress = (cell: GridCell) => {
    setSelected(cell);
    onDayPress(cell.date, cell.value);
  };

  return (
    <View style={{ gap: 6 }}>
      {selected && (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            paddingVertical: 4,
            paddingHorizontal: 8,
            backgroundColor: colors.raised,
            borderRadius: 8,
            alignSelf: "flex-start",
          }}
        >
          <View
            style={{
              width: 10,
              height: 10,
              borderRadius: 2,
              backgroundColor:
                selected.value >= habit.target
                  ? color
                  : selected.value > 0
                    ? color + "80"
                    : colors.border,
            }}
          />
          <Text style={{ color: colors.text, fontSize: 12, fontWeight: "600" }}>
            {selected.monthName} {selected.day}
          </Text>
          <Text style={{ color: colors.muted, fontSize: 12 }}>
            {selected.value}/{habit.target} {habit.unit}
          </Text>
          {selected.value >= habit.target ? (
            <Text style={{ color: colors.accent, fontSize: 11 }}>Done</Text>
          ) : selected.value > 0 ? (
            <Text style={{ color, fontSize: 11 }}>Partial</Text>
          ) : (
            <Text style={{ color: colors.muted, fontSize: 11 }}>Missed</Text>
          )}
          <Pressable
            accessibilityLabel="Deselect"
            onPress={() => setSelected(null)}
          >
            <Text style={{ color: colors.muted, fontSize: 14 }}>x</Text>
          </Pressable>
        </View>
      )}

      <View style={{ flexDirection: "row" }}>
        <View style={{ width: labelWidth }} />
        <View
          style={{
            flexDirection: "row",
            gap: gap,
            height: 14,
            marginBottom: 2,
          }}
        >
          {weeks.map((_, wi) => {
            const ml = monthLabels.find((m) => m.col === wi);
            return (
              <View key={wi} style={{ width: cellSize }}>
                {ml ? (
                  <Text
                    style={{
                      color: colors.muted,
                      fontSize: 9,
                      fontWeight: "600",
                    }}
                  >
                    {ml.label}
                  </Text>
                ) : null}
              </View>
            );
          })}
        </View>
      </View>

      <View style={{ flexDirection: "row" }}>
        <View style={{ width: labelWidth, gap: gap }}>
          {dayLabels.map((label, i) => (
            <View key={i} style={{ height: cellSize, justifyContent: "center" }}>
              <Text
                style={{
                  color: colors.muted,
                  fontSize: 9,
                  fontWeight: label ? "600" : "400",
                }}
              >
                {label}
              </Text>
            </View>
          ))}
        </View>
        <View style={{ flexDirection: "row", gap: gap }}>
          {weeks.map((week, wi) => (
            <View key={wi} style={{ gap: gap }}>
              {Array.from({ length: 7 }, (_, row) => {
                const cell = week.find((c) => c.row === row);
                if (!cell) {
                  return (
                    <View
                      key={row}
                      style={{
                        width: cellSize,
                        height: cellSize,
                        borderRadius: 3,
                      }}
                    />
                  );
                }
                const ratio = cell.value / habit.target;
                const isFuture = cell.date > today;
                const isSelected = selected?.date === cell.date;
                const bg = isFuture
                  ? colors.bg
                  : ratio >= 1
                    ? color
                    : ratio >= 0.5
                      ? color + "90"
                      : ratio > 0
                        ? color + "45"
                        : colors.raised;
                return (
                  <Pressable
                    key={row}
                    accessibilityLabel={`${cell.monthName} ${cell.day}: ${cell.value}/${habit.target} ${habit.unit}`}
                    onPress={isFuture ? undefined : () => handlePress(cell)}
                    style={{
                      width: cellSize,
                      height: cellSize,
                      borderRadius: 3,
                      backgroundColor: bg,
                      borderWidth: cell.date === today ? 1.5 : isSelected ? 1 : 0,
                      borderColor: cell.date === today
                        ? colors.text
                        : isSelected
                          ? colors.accent
                          : "transparent",
                    }}
                  />
                );
              })}
            </View>
          ))}
        </View>
      </View>

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: 2,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
          <Text style={{ color: colors.muted, fontSize: 9 }}>Less</Text>
          {[colors.raised, color + "45", color + "90", color].map((c, i) => (
            <View
              key={i}
              style={{
                width: 10,
                height: 10,
                borderRadius: 2,
                backgroundColor: c,
              }}
            />
          ))}
          <Text style={{ color: colors.muted, fontSize: 9 }}>More</Text>
        </View>
        <Text style={{ color: colors.muted, fontSize: 9 }}>
          Tap a tile to log · white border = today
        </Text>
      </View>
    </View>
  );
}

export function Habits() {
  const { data, act } = useLife(),
    today = dateKey();
  const [edit, setEdit] = useState<any>(null),
    [log, setLog] = useState<any>(null);

  const handleDayPress = (
    habit: any,
    date: string,
    currentValue: number,
  ) => {
    if (habit.type === "boolean") {
      void act((e) =>
        e.logHabit(habit.id, currentValue >= 1 ? 0 : 1, date),
      );
    } else {
      setLog({ ...habit, value: currentValue, date });
    }
  };

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
          const done = stats.value >= h.target;
          const daysTracked = Math.max(
            1,
            Math.ceil(
              (new Date(`${today}T00:00:00`).getTime() -
                new Date(`${h.startDate}T00:00:00`).getTime()) /
                86400000,
            ),
          );
          const completionRate =
            daysTracked > 0 ? Math.round((stats.total / daysTracked) * 100) : 0;
          return (
            <Card
              key={h.id}
              style={{
                flexBasis: 380,
                flexGrow: 1,
                borderTopColor: color,
                borderTopWidth: 3,
              }}
            >
              <View style={[s.row, { justifyContent: "space-between" }]}>
                <View style={[s.row, { gap: 8 }]}>
                  <Tag text={h.type.toUpperCase()} color={color} />
                  {done && <Tag text="DONE TODAY" color={colors.accent} />}
                </View>
                <Button
                  title={`Edit ${h.title}`}
                  kind="quiet"
                  icon="edit-2"
                  onPress={() => setEdit(h)}
                />
              </View>
              <Text style={[s.h2, { fontSize: 23 }]}>{h.title}</Text>
              <View
                style={[s.row, { justifyContent: "space-between", gap: 16 }]}
              >
                <Text style={{ color, fontSize: 32, fontWeight: "600" }}>
                  {stats.value}
                  <Text style={s.muted}>
                    {" "}
                    / {h.target} {h.unit}
                  </Text>
                </Text>
                {h.type === "boolean" ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={done ? "Undo check-in" : "Check in"}
                    onPress={() =>
                      void act((e) => e.logHabit(h.id, done ? 0 : 1))
                    }
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 22,
                      backgroundColor: done ? color : colors.raised,
                      alignItems: "center",
                      justifyContent: "center",
                      borderWidth: 2,
                      borderColor: done ? color : colors.border,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 20,
                        color: done ? colors.bg : colors.muted,
                        fontWeight: "700",
                      }}
                    >
                      {done ? "✓" : "○"}
                    </Text>
                  </Pressable>
                ) : null}
              </View>
              <Progress value={(stats.value / h.target) * 100} color={color} />
              <View
                style={[
                  s.row,
                  { justifyContent: "space-between", flexWrap: "wrap" },
                ]}
              >
                <View style={[s.row, { gap: 4 }]}>
                  <Text style={{ color, fontWeight: "700", fontSize: 16 }}>
                    {stats.streak}
                  </Text>
                  <Text style={s.muted}>streak</Text>
                </View>
                <View style={[s.row, { gap: 4 }]}>
                  <Text style={{ color, fontWeight: "700", fontSize: 16 }}>
                    {stats.rate}%
                  </Text>
                  <Text style={s.muted}>7-day</Text>
                </View>
                <View style={[s.row, { gap: 4 }]}>
                  <Text style={{ color, fontWeight: "700", fontSize: 16 }}>
                    {stats.longest}
                  </Text>
                  <Text style={s.muted}>best</Text>
                </View>
                <View style={[s.row, { gap: 4 }]}>
                  <Text style={{ color, fontWeight: "700", fontSize: 16 }}>
                    {completionRate}%
                  </Text>
                  <Text style={s.muted}>all-time</Text>
                </View>
              </View>
              <ContributionGraph
                habit={h}
                data={data}
                today={today}
                color={color}
                onDayPress={(date, value) => handleDayPress(h, date, value)}
              />
              <Text style={[s.muted, { fontSize: 11 }]}>
                {stats.total} completions in {daysTracked} days
              </Text>
              <View style={s.wrap}>
                {h.type === "boolean" ? (
                  <Button
                    title={done ? "Undo today" : "Mark done"}
                    icon={done ? "x" : "check"}
                    onPress={() =>
                      void act((e) => e.logHabit(h.id, done ? 0 : 1))
                    }
                  />
                ) : (
                  <>
                    <Button
                      title="+ Log progress"
                      onPress={() =>
                        setLog({ ...h, value: stats.value, date: today })
                      }
                    />
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
                  </>
                )}
                <Button
                  title="Backfill"
                  kind="quiet"
                  icon="calendar"
                  onPress={() =>
                    setLog({ ...h, value: 0, date: addDays(today, -1) })
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

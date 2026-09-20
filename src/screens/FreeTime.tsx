import React, { useMemo, useState } from "react";
import { View, Text, Pressable } from "react-native";
import { Card, Choices, Empty, Tag } from "../ui/components";
import { styles as s, colors } from "../ui/theme";
import { useLife } from "../state/store";
import { availability } from "../domain/freeTime";
import { recommendations } from "../domain/priority";
import { addDays, dateKey, clock, duration } from "../domain/time";
import { TaskRow } from "../ui/TaskRow";
export function FreeTime() {
  const { data, minute } = useLife(),
    [day, setDay] = useState("Today"),
    [selected, setSelected] = useState<number | null>(null);
  const today = dateKey(),
    date = day === "Today" ? today : addDays(today, 1);
  const slots = useMemo(
    () => availability(data, date, date === today ? minute : 0),
    [data, date, minute],
  );
  const week = Array.from({ length: 7 }, (_, i) =>
    availability(data, addDays(today, i), i === 0 ? minute : 0).reduce(
      (n, s) => n + s.end - s.start,
      0,
    ),
  ).reduce((a, b) => a + b, 0);
  return (
    <>
      <Choices
        values={["Today", "Tomorrow"]}
        value={day}
        onChange={(v) => {
          setDay(v);
          setSelected(null);
        }}
      />
      <Card>
        <Tag text="ROOM FOR LIFE" color={colors.personal} />
        <Text style={{ fontSize: 44, color: colors.text, fontWeight: "500" }}>
          {duration(slots.reduce((n, b) => n + b.end - b.start, 0))}
        </Text>
        <Text style={s.muted}>
          {day.toLowerCase()} · {duration(week)} open over the next 7 days
        </Text>
      </Card>
      <View style={s.grid}>
        {slots.map((slot, i) => (
          <Pressable
            key={i}
            accessibilityRole="button"
            accessibilityLabel={`Free slot ${clock(slot.start)}`}
            onPress={() => setSelected(i)}
            style={[
              s.card,
              {
                flexBasis: 260,
                flexGrow: 1,
                borderColor: selected === i ? colors.personal : colors.border,
              },
            ]}
          >
            <Text style={s.h2}>
              {clock(slot.start)} – {clock(slot.end)}
            </Text>
            <Text style={{ color: colors.personal, fontSize: 28 }}>
              {duration(slot.end - slot.start)}
            </Text>
            <Text style={s.muted}>See what fits ↗</Text>
          </Pressable>
        ))}
      </View>
      {!slots.length && (
        <Empty text="Your day is full. Move something or let tomorrow hold it." />
      )}
      {selected !== null && slots[selected] && (
        <Card>
          <Text style={s.h2}>A good fit for this window</Text>
          {recommendations(
            data,
            date,
            slots[selected]!.end - slots[selected]!.start,
          )
            .slice(0, 5)
            .map((t) => (
              <TaskRow key={t.id} task={t} />
            ))}
          {!recommendations(
            data,
            date,
            slots[selected]!.end - slots[selected]!.start,
          ).length && (
            <Empty text="No pending task fits. This time can simply be yours." />
          )}
        </Card>
      )}
    </>
  );
}
